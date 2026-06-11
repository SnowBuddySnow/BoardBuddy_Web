import axios from 'axios';

interface ApiErrorBody {
    message?: string;
}

export const getApiErrorStatus = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        return error.response?.status;
    }
    return undefined;
};

export const getApiErrorMessage = (error: unknown) => {
    if (axios.isAxiosError<ApiErrorBody>(error)) {
        return error.response?.data?.message;
    }
    return undefined;
};
