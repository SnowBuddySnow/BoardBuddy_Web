import type { Transition, Variants } from 'motion/react';

/**
 * Shared motion tokens for UI micro-interactions (motion/react).
 * Logo drawing and the hero intro use animejs instead — see BrandMark / LoginLanding.
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user"> in main.tsx.
 */
export const springSnappy: Transition = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 };
export const springSoft: Transition = { type: 'spring', stiffness: 320, damping: 32 };
export const easeOutQuick: Transition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] };

/** Press feedback shared by buttons and tappable cards. */
export const tapPress = { scale: 0.97 } as const;
export const hoverLift = { y: -2 } as const;

export const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, pointerEvents: 'auto', transition: easeOutQuick },
    // A closing overlay must never block the screen underneath, even if its exit animation
    // is delayed (e.g. throttled frames in WebKit): stop taking input the moment exit starts.
    exit: { opacity: 0, pointerEvents: 'none', transition: { duration: 0.14 } },
};

export const dialogVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, pointerEvents: 'auto', transition: springSoft },
    exit: { opacity: 0, y: 8, scale: 0.98, pointerEvents: 'none', transition: { duration: 0.14 } },
};

export const listContainerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
};

export const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: springSoft },
};

/**
 * Screen change: a short opacity-only fade. No transform on purpose: a transformed page
 * wrapper would become the containing block for `position: fixed` modals inside it.
 */
export const pageEnter = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.2, ease: 'easeOut' },
} as const;

/** Spread onto a modal's backdrop / panel (`m.div`) for the shared enter + exit transition. */
export const overlayMotion = { variants: overlayVariants, initial: 'hidden', animate: 'visible', exit: 'exit' } as const;
export const dialogMotion = { variants: dialogVariants, initial: 'hidden', animate: 'visible', exit: 'exit' } as const;
