import type { ConsentItemInput, ConsentResponseType } from '../types/api';

export interface ConsentDraft {
    agreed?: boolean;
    responseText?: string;
}

export type ConsentFieldItem = Pick<ConsentItemInput, 'responseType' | 'required' | 'title'>;

const textResponseTypes = new Set<ConsentResponseType>([
    'TEXT',
    'TEXTAREA',
    'EMAIL',
    'PHONE',
    'NUMBER',
    'DATE',
    'TIME',
    'URL',
]);

export const usesTextResponse = (responseType: ConsentResponseType) => textResponseTypes.has(responseType);

export const isConsentItemComplete = (item: ConsentFieldItem, draft?: ConsentDraft) => {
    if (!item.required) return true;
    if (item.responseType === 'CHECKBOX') return draft?.agreed === true;
    if (usesTextResponse(item.responseType)) return Boolean(draft?.responseText?.trim());
    return true;
};

const isValidDate = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
};

export const getConsentResponseError = (item: ConsentFieldItem, draft?: ConsentDraft): string | null => {
    if (!isConsentItemComplete(item, draft)) {
        return item.responseType === 'CHECKBOX'
            ? `${item.title}: 필수 동의 항목을 확인해 주세요.`
            : `${item.title}: 필수 정보를 입력해 주세요.`;
    }

    const value = draft?.responseText?.trim();
    if (!value) return null;

    switch (item.responseType) {
        case 'EMAIL':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
                ? null
                : `${item.title}: 올바른 이메일 주소를 입력해 주세요.`;
        case 'PHONE': {
            const digitCount = (value.match(/\d/g) || []).length;
            return /^[0-9+() .-]+$/.test(value) && digitCount >= 7 && digitCount <= 15 && value.length <= 50
                ? null
                : `${item.title}: 올바른 전화번호를 입력해 주세요.`;
        }
        case 'NUMBER':
            return Number.isFinite(Number(value)) ? null : `${item.title}: 숫자를 입력해 주세요.`;
        case 'DATE':
            return isValidDate(value) ? null : `${item.title}: 올바른 날짜를 선택해 주세요.`;
        case 'TIME':
            return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
                ? null
                : `${item.title}: 올바른 시간을 선택해 주세요.`;
        case 'URL':
            try {
                const url = new URL(value);
                return (url.protocol === 'http:' || url.protocol === 'https:') && value.length <= 2000
                    ? null
                    : `${item.title}: http 또는 https 주소를 입력해 주세요.`;
            } catch {
                return `${item.title}: 올바른 웹 주소를 입력해 주세요.`;
            }
        default:
            return null;
    }
};
