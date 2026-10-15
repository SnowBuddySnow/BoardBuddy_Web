import { describe, expect, it } from 'vitest';
import { getConsentResponseError, isConsentItemComplete, usesTextResponse } from './consentResponse';
import type { ConsentResponseType } from '../types/api';

const item = (responseType: ConsentResponseType, required = true) => ({
    title: 'Scenario field', responseType, required,
});

describe('event consent scenario validation', () => {
    it('requires explicit acceptance only for required checkboxes', () => {
        expect(isConsentItemComplete(item('CHECKBOX'), { agreed: false })).toBe(false);
        expect(getConsentResponseError(item('CHECKBOX'), { agreed: false })).not.toBeNull();
        expect(getConsentResponseError(item('CHECKBOX'), { agreed: true })).toBeNull();
        expect(getConsentResponseError(item('CHECKBOX', false), { agreed: false })).toBeNull();
    });

    it('does not invent a response for information-only items', () => {
        expect(usesTextResponse('INFORMATION')).toBe(false);
        expect(getConsentResponseError(item('INFORMATION', false))).toBeNull();
    });

    it.each<ConsentResponseType>(['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'NUMBER', 'DATE', 'TIME', 'URL'])(
        'rejects whitespace-only required %s but permits a blank optional response', type => {
            expect(getConsentResponseError(item(type), { responseText: '   ' })).not.toBeNull();
            expect(getConsentResponseError(item(type, false), { responseText: '   ' })).toBeNull();
        },
    );

    it.each<[ConsentResponseType, string]>([
        ['EMAIL', 'scenario@example.invalid'], ['PHONE', '+82 (10) 0000-0000'],
        ['NUMBER', '-12.50'], ['NUMBER', '1e2'], ['DATE', '2028-02-29'],
        ['TIME', '23:59:59'], ['URL', 'https://example.invalid/event'],
    ])('accepts a valid %s response without changing its original text', (type, value) => {
        const draft = { responseText: value };
        expect(getConsentResponseError(item(type), draft)).toBeNull();
        expect(draft.responseText).toBe(value);
    });

    it.each<[ConsentResponseType, string]>([
        ['EMAIL', 'not-an-email'], ['EMAIL', `a@${'b'.repeat(250)}.invalid`],
        ['PHONE', '123'], ['PHONE', '1234567890123456'], ['PHONE', '010-call-me'],
        ['NUMBER', 'NaN'], ['NUMBER', 'Infinity'], ['NUMBER', '12,50'],
        ['NUMBER', '0x10'], ['NUMBER', '0b10'], ['NUMBER', '0o10'],
        ['DATE', '2026-02-29'], ['DATE', '2026-04-31'], ['DATE', '2026-13-01'],
        ['TIME', '24:00'], ['TIME', '09:60'], ['TIME', '9:00'],
        ['URL', 'javascript:alert(1)'], ['URL', 'file:///etc/passwd'], ['URL', 'not-a-url'],
    ])('rejects malformed %s even when the field is optional: %s', (type, value) => {
        expect(getConsentResponseError(item(type, false), { responseText: value })).not.toBeNull();
    });

    it('rejects text over the server limit before submitting the entire consent sheet', () => {
        expect(getConsentResponseError(item('TEXTAREA'), { responseText: 'x'.repeat(5000) })).toBeNull();
        expect(getConsentResponseError(item('TEXTAREA'), { responseText: 'x'.repeat(5001) })).not.toBeNull();
    });
});
