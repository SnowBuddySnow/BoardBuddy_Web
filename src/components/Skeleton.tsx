import { cn } from '../lib/utils';

/**
 * Layout-shaped loading placeholder. It stays invisible for the first 400ms (CSS) so fast
 * loads never flash a skeleton, then pulses in the same footprint as the real content.
 */
export function Skeleton({ className }: { className?: string }) {
    return <span aria-hidden="true" className={cn('bb-skeleton block rounded-lg bg-zinc-200/70', className)} />;
}

/** A card-shaped group of skeleton lines with an accessible loading label. */
export function SkeletonCard({ label, lines = 3, className }: { label: string; lines?: number; className?: string }) {
    return (
        <div role="status" aria-label={label} className={cn('rounded-2xl border border-slate-200 bg-white p-4', className)}>
            <Skeleton className="h-4 w-24" />
            <div className="mt-3 space-y-2">
                {Array.from({ length: lines }, (_, index) => <Skeleton key={index} className={index === lines - 1 ? 'h-3 w-2/3' : 'h-3 w-full'} />)}
            </div>
        </div>
    );
}
