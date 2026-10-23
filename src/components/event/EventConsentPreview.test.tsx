// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { EventConsentPreview } from './EventConsentPreview';

it('keeps keyboard focus inside the response preview and restores the opener on close', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = document.createElement('div'); document.body.append(container);
    const opener = document.createElement('button'); opener.textContent = 'Preview opener'; document.body.append(opener); opener.focus();
    const root = createRoot(container); const close = vi.fn();
    try {
        await act(async () => root.render(<EventConsentPreview open items={[]} consentWindowMinutes={null} onClose={close} />));
        const dialog = document.querySelector('[role="dialog"]')!;
        const controls = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        expect(document.activeElement).toBe(controls[0]);
        await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })));
        expect(document.activeElement).toBe(controls[controls.length - 1]);
        await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })));
        expect(document.activeElement).toBe(controls[0]);
        await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
        expect(close).toHaveBeenCalledOnce();
        await act(async () => root.render(<EventConsentPreview open={false} items={[]} consentWindowMinutes={null} onClose={close} />));
        expect(document.activeElement).toBe(opener);
    } finally { await act(async () => root.unmount()); container.remove(); opener.remove(); vi.unstubAllGlobals(); }
});
