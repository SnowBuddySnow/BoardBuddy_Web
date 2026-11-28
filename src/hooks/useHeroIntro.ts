import { useLayoutEffect, type RefObject } from 'react';

const prefersReducedMotion = () =>
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Never keep the hero hidden longer than this while animejs loads. */
const MAX_PENDING_MS = 1200;

/**
 * animejs-only hero intro: a calm, staggered reveal of `[data-hero-item]` (headline, copy,
 * the three start steps) and the `[data-hero-card]` login card inside `rootRef`.
 * The brand mark itself stays still.
 *
 * - animejs is loaded on demand so it stays out of the entry chunk. Until it is ready the
 *   root carries `data-hero-intro="pending"` (CSS hides the animated parts), so there is no
 *   flash of the final state; on load failure or timeout the content is simply shown.
 * - Everything animates *from* a hidden state to the element's natural state.
 * - Runs once per mount; the anime scope reverts on unmount, restoring inline styles.
 */
export function useHeroIntro(rootRef: RefObject<HTMLElement | null>) {
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root || prefersReducedMotion()) return;

        let cancelled = false;
        let revert: (() => void) | undefined;
        const reveal = () => { delete root.dataset.heroIntro; };

        root.dataset.heroIntro = 'pending';
        const timeout = window.setTimeout(reveal, MAX_PENDING_MS);

        import('animejs')
            .then(({ createScope, createTimeline, stagger }) => {
                if (cancelled) return;
                const scope = createScope({ root }).add(() => {
                    createTimeline({ defaults: { ease: 'outCubic' } })
                        .add('[data-hero-item]', { opacity: [0, 1], translateY: [8, 0], duration: 700, delay: stagger(110) }, 0)
                        .add('[data-hero-card]', { opacity: [0, 1], translateY: [12, 0], duration: 800 }, 160)
                        // Apply every child's starting values now, before the pending mask is lifted.
                        .init();
                });
                revert = () => scope.revert();
            })
            .catch(() => undefined)
            .finally(() => {
                window.clearTimeout(timeout);
                if (!cancelled) reveal();
            });

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
            revert?.();
            reveal();
        };
    }, [rootRef]);
}
