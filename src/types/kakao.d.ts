declare global {
    interface KakaoAuthResponse {
        access_token: string;
    }

    interface KakaoAuth {
        login(options: {
            success: (authObj: KakaoAuthResponse) => void;
            fail: (error: unknown) => void;
        }): void;
    }

    interface KakaoSdk {
        Auth: KakaoAuth;
        init(key: string): void;
        isInitialized(): boolean;
    }

    interface Window {
        Kakao?: KakaoSdk;
    }
}

export { };
