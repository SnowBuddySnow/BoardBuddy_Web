import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // If cookies are needed later
});

// Flag to prevent multiple simultaneous refresh requests
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: string) => void;
    reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token || undefined);
        }
    });
    failedQueue = [];
};

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized - Token expired
        // 응답 형식: { code: 401, message: "만료된 JWT 토큰입니다.", data: null }
        const errorResponse = error.response?.data as { code?: number; message?: string } | undefined;
        const isTokenExpired = error.response?.status === 401 && 
            (errorResponse?.code === 401 || errorResponse?.message?.includes('만료된 JWT 토큰'));
        
        if (isTokenExpired && originalRequest && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                // No refresh token, redirect to login
                processQueue(error, null);
                isRefreshing = false;
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('autoLogin');
                // Redirect to login page
                if (window.location.pathname !== '/') {
                    window.location.href = '/';
                }
                return Promise.reject(error);
            }

            try {
                // Request new access token using refresh token
                // Header에 Authorization: Bearer {refreshToken} 형식으로 요청
                const response = await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
                    {},
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${refreshToken}`,
                        },
                    }
                );

                // 응답 형식: { code: 200, message: "...", data: { accessToken, refreshToken } }
                const responseData = response.data;
                
                if (responseData.code === 200 && responseData.data) {
                    const { accessToken, refreshToken: newRefreshToken } = responseData.data;

                    if (accessToken) {
                        localStorage.setItem('accessToken', accessToken);
                        if (newRefreshToken) {
                            localStorage.setItem('refreshToken', newRefreshToken);
                        }

                        // Update the original request with new token
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        }

                        // Process queued requests
                        processQueue(null, accessToken);
                        isRefreshing = false;

                        // Retry the original request
                        return apiClient(originalRequest);
                    } else {
                        throw new Error('No access token in refresh response');
                    }
                } else {
                    throw new Error('Invalid refresh response format');
                }
            } catch (refreshError) {
                // Refresh failed - check if it's refresh token expiration
                const axiosError = refreshError as AxiosError;
                
                // 네트워크 에러가 아닌 경우에만 응답 데이터 확인
                if (axiosError.response) {
                    const errorResponse = axiosError.response.data as { code?: number; message?: string } | undefined;
                    
                    // Refresh 토큰도 만료된 경우 (code: 401, message: "만료된 리프레시 토큰입니다.")
                    if (errorResponse?.code === 401 && errorResponse?.message?.includes('리프레시 토큰')) {
                        // Clear tokens and redirect to login
                        processQueue(axiosError, null);
                        isRefreshing = false;
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        localStorage.removeItem('autoLogin');
                        // Redirect to login page
                        if (window.location.pathname !== '/') {
                            window.location.href = '/';
                        }
                        return Promise.reject(refreshError);
                    }
                }
                
                // Other refresh errors (네트워크 에러 포함)
                // 네트워크 에러의 경우에도 토큰을 지우고 로그인 페이지로 리다이렉트
                processQueue(axiosError, null);
                isRefreshing = false;
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('autoLogin');
                // Redirect to login page
                if (window.location.pathname !== '/') {
                    window.location.href = '/';
                }
                return Promise.reject(refreshError);
            }
        }

        // Handle other errors
        return Promise.reject(error);
    }
);

export default apiClient;
