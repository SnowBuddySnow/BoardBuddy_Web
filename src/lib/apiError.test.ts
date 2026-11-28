import axios, { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, getApiErrorStatus } from './apiError';

const makeAxiosError = (status: number, message?: string) =>
    new AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
            status,
            statusText: 'Error',
            headers: {},
            config: { headers: new AxiosHeaders() },
            data: message !== undefined ? { message } : {},
        },
    );

describe('apiError helpers', () => {
    it('extracts status code and server message from AxiosError', () => {
        const error = makeAxiosError(409, '이미 가입 신청이 존재합니다.');
        expect(axios.isAxiosError(error)).toBe(true);
        expect(getApiErrorStatus(error)).toBe(409);
        expect(getApiErrorMessage(error)).toBe('이미 가입 신청이 존재합니다.');
    });

    it('returns undefined when error is not an AxiosError or has no message', () => {
        expect(getApiErrorStatus(new Error('network'))).toBeUndefined();
        expect(getApiErrorMessage(new Error('network'))).toBeUndefined();
        expect(getApiErrorMessage(makeAxiosError(500))).toBeUndefined();
        expect(getApiErrorStatus('plain-string')).toBeUndefined();
    });
});
