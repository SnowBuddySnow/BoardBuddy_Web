import { cn } from '../lib/utils';

/**
 * BoardBuddy monogram: a rounded monoline "B" echoing the wordmark, plus a small sun-dot accent.
 * Static by design. Hosts that want the intro draw it with animejs by targeting
 * `[data-brand-stroke]` and `[data-brand-dot]` (see useHeroIntro).
 */
export default function BrandMark({ size = 40, className, title }: { size?: number; className?: string; title?: string }) {
    return (
        <svg
            viewBox="0 0 64 64"
            width={size}
            height={size}
            role={title ? 'img' : undefined}
            aria-label={title}
            aria-hidden={title ? undefined : true}
            focusable="false"
            className={cn('shrink-0', className)}
        >
            <rect data-brand-badge x="2" y="2" width="60" height="60" rx="18" fill="#ffffff" stroke="rgba(22,38,96,0.08)" strokeWidth="1.5" />
            <path
                data-brand-stroke
                d="M19 33 V17 a3 3 0 0 1 3 -3 H31 a9.5 9.5 0 0 1 0 19 H24 M24 33 H35 a9 9 0 0 1 0 18 H22 a3 3 0 0 1 -3 -3 V33"
                fill="none"
                stroke="var(--color-brand-navy)"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle data-brand-dot cx="49" cy="16" r="4.5" fill="var(--color-brand-blue)" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
        </svg>
    );
}

export function BrandWordmark({ className }: { className?: string }) {
    return (
        <span className={cn('text-lg font-black tracking-tight', className)}>
            <span className="text-brand-navy">Board</span>
            <span className="text-brand-blue">Buddy</span>
        </span>
    );
}
