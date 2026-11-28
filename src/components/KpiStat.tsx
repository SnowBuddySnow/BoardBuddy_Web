import { memo, useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { ChartStatFlow, type ChartStatFlowFormat, useNumberFlowElementReady } from './charts/chart-stat-flow';
import { cn } from '../lib/utils';

const integerFormat: ChartStatFlowFormat = { notation: 'standard', maximumFractionDigits: 0 };

/**
 * NumberFlow only animates value *changes*, so start at 0 and hand over the real value on the
 * next frame: a count-up on first render, and a roll on later updates.
 */
function useCountUp(value: number) {
    const [shown, setShown] = useState(0);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setShown(value));
        return () => cancelAnimationFrame(frame);
    }, [value]);
    return shown;
}

/**
 * KPI number with count-up (Bklit ChartStatFlow → NumberFlow) and a label underneath.
 * NumberFlow honours prefers-reduced-motion on its own (the value then appears without
 * rolling), and memo keeps parents' unrelated state changes from re-rendering the digits.
 */
export const KpiStat = memo(function KpiStat({
    value,
    label,
    suffix,
    className,
    valueClassName = 'text-xl font-black text-brand-navy',
    labelClassName = 'text-[11px] font-semibold text-zinc-500',
}: {
    value: number;
    label: string;
    suffix?: string;
    className?: string;
    valueClassName?: string;
    labelClassName?: string;
}) {
    const shown = useCountUp(value);
    return (
        <div className={cn('flex min-w-0 flex-col', className)}>
            {/* NumberFlow renders digits in shadow DOM; expose one plain-text reading instead. */}
            <span className="sr-only">{label} {value}{suffix ?? ''}</span>
            <span aria-hidden="true" className="contents">
            <ChartStatFlow
                value={shown}
                label={label}
                suffix={suffix}
                formatOptions={integerFormat}
                valueClassName={cn('leading-tight', valueClassName)}
                labelClassName={labelClassName}
            />
            </span>
        </div>
    );
});

/** Inline count-up number without a label, for composing values such as "3박 / 5박". */
export const CountUpNumber = memo(function CountUpNumber({ value, suffix, className }: { value: number; suffix?: string; className?: string }) {
    const shown = useCountUp(value);
    const ready = useNumberFlowElementReady();
    return (
        <span className={cn('tabular-nums', className)}>
            <span className="sr-only">{value}{suffix ?? ''}</span>
            <span aria-hidden="true">
                {ready ? <NumberFlow value={shown} suffix={suffix} format={integerFormat} isolate willChange /> : `${shown}${suffix ?? ''}`}
            </span>
        </span>
    );
});

export default KpiStat;
