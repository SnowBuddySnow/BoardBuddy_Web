// @vitest-environment jsdom
import { act, lazy, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageBoundary from './PageBoundary';

describe('split screen loading and failure recovery', () => {
    let root: Root;
    let container: HTMLDivElement;
    beforeEach(() => {
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
        container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    });
    afterEach(async () => {
        await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
    });
    it('shows a loading state, then the requested screen', async () => {
        let resolve!: (value: { default: () => ReactNode }) => void;
        const promise = new Promise<{ default: () => ReactNode }>(done => { resolve = done; });
        const Screen = lazy(() => promise);
        await act(async () => root.render(<PageBoundary onBack={vi.fn()}><Screen /></PageBoundary>));
        expect(container.querySelector('[role="status"]')?.textContent).toContain('불러오는 중');
        await act(async () => { resolve({ default: () => <h1>Synthetic screen</h1> }); await promise; });
        expect(container.textContent).toBe('Synthetic screen');
        expect(container.querySelector('[role="status"]')).toBeNull();
    });
    it('gives a safe failure message and home action, and resets on route change', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const back = vi.fn();
        const Screen = lazy(() => Promise.reject(new Error('synthetic raw exception must stay hidden')));
        await act(async () => root.render(<PageBoundary key="failed" onBack={back}><Screen /></PageBoundary>));
        expect(container.querySelector('[role="alert"]')?.textContent).toContain('화면을 불러오지 못했습니다');
        expect(container.textContent).not.toContain('raw exception');
        await act(async () => container.querySelector('button')!.click());
        expect(back).toHaveBeenCalledOnce();
        await act(async () => root.render(<PageBoundary key="home" onBack={back}><h1>Home</h1></PageBoundary>));
        expect(container.textContent).toBe('Home');
    });
});
