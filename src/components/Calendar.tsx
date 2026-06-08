import { useState, useMemo, useEffect } from 'react';
import { Button } from './Button';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface CalendarProps {
    month: string;
    year: number;
    startDayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
    totalDays: number;
    availableDays?: number[];
    selectedDays?: number[];
    onDayClick?: (day: number) => void;
    renderDay?: (day: number) => React.ReactNode;
    expandable?: boolean;
    hideHeader?: boolean;
    maxWeeks?: number;
    startWeekIndex?: number;
    isCollapsed?: boolean;
    compact?: boolean; // For compact spacing (14px row spacing)
    onPrevMonth?: () => void;
    onNextMonth?: () => void;
}

export const Calendar = ({
    month,
    year,
    startDayOfWeek,
    totalDays,
    availableDays = [],
    selectedDays = [],
    onDayClick,
    renderDay,
    expandable = false,
    hideHeader = false,
    maxWeeks,
    startWeekIndex = 0,
    headerRight,
    headerTop,
    className,
    isCollapsed,
    compact = false,
    onPrevMonth,
    onNextMonth,
}: CalendarProps & { headerRight?: React.ReactNode, headerTop?: React.ReactNode, className?: string }) => {
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [focusedWeekIndex, setFocusedWeekIndex] = useState<number | null>(null);

    // Group days into weeks
    const weeks = useMemo(() => {
        const weeksArray: (number | null)[][] = [];
        let currentWeek: (number | null)[] = [];

        // Add empty slots for start of month
        for (let i = 0; i < startDayOfWeek; i++) {
            currentWeek.push(null);
        }

        // Add days
        for (let day = 1; day <= totalDays; day++) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeksArray.push(currentWeek);
                currentWeek = [];
            }
        }

        // Fill remaining slots in last week
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeksArray.push(currentWeek);
        }

        if (maxWeeks) {
            return weeksArray.slice(startWeekIndex, startWeekIndex + maxWeeks);
        }

        return weeksArray;
    }, [startDayOfWeek, totalDays, maxWeeks, startWeekIndex]);

    // Handle external collapse state changes
    useEffect(() => {
        if (isCollapsed !== undefined) {
            if (isCollapsed) {
                setViewMode('week');
                // Auto-focus the week containing the selected day
                if (selectedDays.length > 0) {
                    const day = selectedDays[0];
                    const index = weeks.findIndex(w => w.includes(day));
                    if (index !== -1) setFocusedWeekIndex(index);
                } else if (focusedWeekIndex === null) {
                    // Default to first week if nothing select/focused
                    setFocusedWeekIndex(0);
                }
            } else {
                setViewMode('month');
            }
        }
    }, [isCollapsed, selectedDays, weeks, focusedWeekIndex]);

    const handleDayClick = (day: number, weekIndex: number) => {
        if (expandable && viewMode === 'month') {
            setFocusedWeekIndex(weekIndex);
            setViewMode('week');
        } else {
            onDayClick?.(day);
        }
    };

    const handleBackToMonth = () => {
        setViewMode('month');
    };

    return (
        <div className={`flex flex-col w-full ${compact ? 'bg-transparent' : 'bg-[#F4F4F5] dark:bg-zinc-900'} rounded-[20px] ${compact ? '' : 'p-4'} ${className || ''}`}>
            {/* Optional Header Top Content */}
            {headerTop && (
                <div className="mb-4 w-full">
                    {headerTop}
                </div>
            )}

            {/* Top Control Row */}
            {!hideHeader && (
                <div className="flex justify-between items-center mb-2 px-1">
                    <div className="bg-white dark:bg-zinc-800 px-5 py-1 rounded-full shadow-sm text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {year}
                    </div>
                    {headerRight}
                </div>
            )}

            {/* Month Header Bar */}
            {!hideHeader && (
                <div className="w-full bg-white dark:bg-zinc-800 rounded-2xl py-1 shadow-sm mb-2 flex items-center px-4">
                    <Button
                        variant="ghost"
                        size="small"
                        className="text-zinc-900 dark:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={onPrevMonth}
                        disabled={!onPrevMonth}
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </Button>
                    <h2 className="flex-1 text-center text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {month}
                    </h2>
                    <Button
                        variant="ghost"
                        size="small"
                        className="text-zinc-900 dark:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={onNextMonth}
                        disabled={!onNextMonth}
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </Button>
                </div>
            )}

            {/* Calendar Card */}
            <div className="w-full bg-white dark:bg-zinc-800 rounded-[20px] p-4 shadow-sm overflow-visible">
                <div className="flex flex-col h-full overflow-visible">

                    {/* Calendar Grid Header */}
                    <div className={`w-full grid grid-cols-7 gap-x-2 border-b border-zinc-100 dark:border-zinc-700 ${compact ? 'pb-[10px]' : 'pb-3'}`}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="text-center text-zinc-400 dark:text-zinc-500 text-sm font-bold">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Weeks Rows */}
                    <div className="flex flex-col">
                        {weeks.map((week, weekIndex) => {
                            // Determine if this row should be visible
                            // In month view: All visible
                            // In week view: Only the focused week is visible
                            const isFocused = focusedWeekIndex === weekIndex;
                            const isHidden = viewMode === 'week' && !isFocused;
                            const isLastWeek = weekIndex === weeks.length - 1;

                            return (
                                <div
                                    key={weekIndex}
                                    className={`
                                        grid grid-cols-7 gap-x-2 transition-all duration-500 ease-in-out
                                        ${isHidden ? 'max-h-0 opacity-0 py-0 overflow-hidden' : 'overflow-visible'}
                                        ${isHidden ? '' : compact ? 'min-h-[56px] opacity-100 py-[12px]' : 'min-h-[68px] opacity-100 py-1'}
                                        ${!isLastWeek && !isHidden ? 'border-b border-zinc-100 dark:border-zinc-700' : ''}
                                    `}
                                >
                                    {week.map((day, dayIndex) => {
                                        if (day === null) {
                                            return <div key={`empty-${weekIndex}-${dayIndex}`} className="h-full" />;
                                        }

                                        const isAvailable = availableDays.includes(day);
                                        const isSelected = selectedDays.includes(day);

                                        if (renderDay) {
                                            return (
                                                <div key={day} className="flex flex-col items-center justify-start h-full" onClick={() => handleDayClick(day, weekIndex)}>
                                                    {renderDay(day)}
                                                </div>
                                            )
                                        }

                                        return (
                                            <div key={day} className="flex flex-col items-center justify-start h-full pt-1">
                                                <button
                                                    onClick={() => handleDayClick(day, weekIndex)}
                                                    disabled={!isAvailable && !expandable}
                                                    className={`
                                                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                                                        ${isSelected ? 'bg-[#F6C555] text-black shadow-sm' : ''}
                                                        ${!isSelected && isAvailable ? 'text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800' : ''}
                                                        ${!isSelected && !isAvailable ? 'text-zinc-300 dark:text-zinc-700 cursor-default' : ''}
                                                        ${viewMode === 'week' ? 'mt-4' : ''} 
                                                    `}
                                                >
                                                    {day}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Back to Month Button (Bottom) - Only show if expandable is true */}
                    {expandable && (
                        <div className={`mt-auto flex justify-center transition-opacity duration-300 ${viewMode === 'week' ? 'opacity-100' : 'opacity-0 pointer-events-none h-0'}`}>
                            <Button variant="ghost" size="small" onClick={handleBackToMonth} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 text-xs">
                                Back to Month
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
