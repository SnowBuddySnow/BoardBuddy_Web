// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentResponseField } from './ConsentResponseField';

describe('ConsentResponseField', () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.unstubAllGlobals();
    });

    it('toggles required checkbox agreement', async () => {
        const onChange = vi.fn();
        await act(async () => {
            root.render(
                <ConsentResponseField
                    item={{ title: '안전 수칙 동의', responseType: 'CHECKBOX', required: true }}
                    draft={{ agreed: false }}
                    onChange={onChange}
                />,
            );
        });

        const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
        expect(checkbox?.checked).toBe(false);
        expect(container.textContent).toContain('내용을 확인했으며 동의합니다.');

        await act(async () => {
            checkbox?.click();
        });
        expect(onChange).toHaveBeenCalledWith({ agreed: true });
    });

    it('renders tel input for PHONE, character counter for TEXTAREA, and no input for INFORMATION', async () => {
        const onChange = vi.fn();
        await act(async () => {
            root.render(
                <ConsentResponseField
                    item={{ title: '비상 연락처', responseType: 'PHONE', required: true }}
                    draft={{ responseText: '' }}
                    onChange={onChange}
                />,
            );
        });

        const telInput = container.querySelector<HTMLInputElement>('input[type="tel"]');
        expect(telInput).not.toBeNull();
        expect(telInput?.getAttribute('aria-label')).toBe('비상 연락처 응답');

        await act(async () => {
            root.render(
                <ConsentResponseField
                    item={{ title: '특이사항', responseType: 'TEXTAREA', required: false }}
                    draft={{ responseText: '알레르기 없음' }}
                    onChange={onChange}
                />,
            );
        });
        expect(container.textContent).toContain('7/5,000');

        await act(async () => {
            root.render(
                <ConsentResponseField
                    item={{ title: '안내 사항', responseType: 'INFORMATION', required: false }}
                    draft={{}}
                    onChange={onChange}
                />,
            );
        });
        expect(container.querySelector('input, textarea')).toBeNull();
    });
});
