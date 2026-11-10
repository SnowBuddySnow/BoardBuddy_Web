// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Calendar } from './Calendar';

describe('reservation calendar interaction', () => {
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

    it('selects a custom date using Enter or Space and exposes the selected state', async () => {
        const onDayClick = vi.fn();
        await act(async () => root.render(<Calendar month="11월" year={2026} totalDays={30} startDayOfWeek={0}
            selectedDays={[14]} onDayClick={onDayClick} renderDay={day => <span>{day}</span>} />));
        const date = container.querySelector('[aria-label="2026년 11월 14일"]')!;
        expect(date.getAttribute('aria-pressed')).toBe('true');
        for (const key of ['Enter', ' ']) {
            await act(async () => date.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
        }
        expect(onDayClick.mock.calls).toEqual([[14], [14]]);
        expect(container.querySelector('[aria-label="이전 달"]')?.hasAttribute('disabled')).toBe(true);
    });

    it('keeps collapsed weeks out of keyboard navigation and restores the full month', async () => {
        await act(async () => root.render(<Calendar month="11월" year={2026} totalDays={30} startDayOfWeek={0}
            selectedDays={[14]} expandable renderDay={day => <span>{day}</span>} />));
        await act(async () => (container.querySelector('[aria-label="2026년 11월 14일"]') as HTMLElement).click());
        expect(container.querySelector('[aria-label="2026년 11월 1일"]')?.closest('[inert]')).not.toBeNull();
        expect(container.querySelector('[aria-label="2026년 11월 14일"]')?.closest('[inert]')).toBeNull();
        const restore = [...container.querySelectorAll('button')].find(button => button.textContent === '월 전체 보기')!;
        await act(async () => restore.click());
        expect(container.querySelector('[inert]')).toBeNull();
        expect(container.textContent).not.toContain('월 전체 보기');
    });
});
