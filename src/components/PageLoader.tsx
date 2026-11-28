import BuddyMascot from './BuddyMascot';

/**
 * Waiting screen for lazily loaded screens. It fades in after a short delay (CSS), so fast
 * loads show nothing instead of flashing a loader; the mascot floats gently unless the viewer
 * prefers reduced motion. Matches the boot loader in index.html.
 */
export default function PageLoader({ label = '화면을 불러오는 중이에요' }: { label?: string }) {
    return (
        <div role="status" aria-live="polite" className="bb-loader flex h-full min-h-[50dvh] flex-1 flex-col items-center justify-center gap-3 bg-brand-cream px-6 text-center">
            <span className="bb-loader-mascot inline-flex"><BuddyMascot size={120} /></span>
            <p className="text-sm font-bold text-brand-navy">{label}</p>
        </div>
    );
}
