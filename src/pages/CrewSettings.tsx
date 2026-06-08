import { Button } from '../components/Button';
import { ChevronLeftIcon, SaveIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCrewInfo, updateCrew } from '../services/crew';
import { getUserInfo } from '../services/user';
import { CrewInfoUpdateRequest } from '../types/api';
import Promote from './Promote';

interface CrewSettingsProps {
    onBack: () => void;
}

export default function CrewSettings({ onBack }: CrewSettingsProps) {
    const DAY_TO_KR: { [key: string]: string } = {
        'MONDAY': '월요일',
        'TUESDAY': '화요일',
        'WEDNESDAY': '수요일',
        'THURSDAY': '목요일',
        'FRIDAY': '금요일',
        'SATURDAY': '토요일',
        'SUNDAY': '일요일'
    };

    const [loading, setLoading] = useState(true);
    const [crewId, setCrewId] = useState<number | null>(null);
    const [showPromote, setShowPromote] = useState(false);
    const [isPresident, setIsPresident] = useState(false);
    const [formData, setFormData] = useState<CrewInfoUpdateRequest>({
        crewName: '',
        crewPIN: 0,
        reservationOpenDay: 'FRIDAY',
        reservationOpenTime: '18:00',
        reservationOpenOffsetDays: 3,
        dailyCapacity: 0,
        isCapacityLimited: false,
        reservationPeriodLimitDays: 7
    });

    // UI state for PIN to allow string input with leading zeros
    const [pinInput, setPinInput] = useState('');

    const [showPin, setShowPin] = useState(false);

    // Temp New Scheme State
    // const [targetDay, setTargetDay] = useState('MONDAY');
    // const [daysBefore, setDaysBefore] = useState(3);
    const [isAlwaysOpen, setIsAlwaysOpen] = useState(false);
    // const [targetTime, setTargetTime] = useState('18:00');

    const calculateOpenDay = () => {
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const targetIndex = days.indexOf(formData.reservationOpenDay);
        if (targetIndex === -1) return 'UNKNOWN';
        let openIndex = (targetIndex - formData.reservationOpenOffsetDays) % 7;
        if (openIndex < 0) openIndex += 7;
        return days[openIndex];
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = await getUserInfo();
                if (user.crew) {
                    const cId = user.crew.crewId;
                    setCrewId(cId);
                    setIsPresident(user.role === 'PRESIDENT');
                    const info = await getCrewInfo(cId);

                    setFormData({
                        crewName: info.name,
                        crewPIN: 1234, // Default to number, ideally fetch if API exposes or leave blank
                        reservationOpenDay: info.reservationOpenDay,
                        reservationOpenTime: info.reservationOpenTime,
                        reservationOpenOffsetDays: info.reservationOpenOffsetDays || 3, // Default fallback
                        dailyCapacity: info.dailyCapacity,
                        isCapacityLimited: info.isCapacityLimited,
                        reservationPeriodLimitDays: info.reservationPeriodLimitDays || 7
                    });
                    // Initialize UI PIN state (empty by default for security, or dummy if needed)
                    setPinInput('');
                }
            } catch (error) {
                console.error("Failed to fetch crew settings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (field: keyof CrewInfoUpdateRequest, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow numeric characters only (or empty)
        if (/^\d*$/.test(value)) {
            setPinInput(value);
            // Sync with formData as number
            const numValue = value === '' ? 0 : parseInt(value, 10);
            setFormData(prev => ({ ...prev, crewPIN: numValue }));
        }
    };

    const handleSave = async () => {
        if (!crewId) return;

        // Construct payload with possible aliases to handle API strictness
        // Exclude crewName if not PRESIDENT to avoid AccessDeniedException
        const payload: any = {
            ...formData,
            id: crewId,
        };

        if (!isPresident) {
            delete payload.crewName;
        } else {
            payload.name = formData.crewName;
        }

        const confirmed = window.confirm(`설정을 저장하시겠습니까?`);
        if (!confirmed) return;

        try {
            console.log("Saving Crew Settings:", { crewId, payload });
            await updateCrew(crewId, payload as any);
            alert("설정이 저장되었습니다.");
            onBack();
        } catch (error) {
            console.error("Failed to update crew", error);
            alert("저장 중 오류가 발생했습니다. (Console을 확인해주세요)");
        }
    };

    if (loading) return <div className="flex-1 flex items-center justify-center">로딩 중...</div>;

    if (showPromote && crewId) {
        return <Promote crewId={crewId} onBack={() => setShowPromote(false)} />;
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between relative bg-white dark:bg-zinc-950 z-10">
                <Button variant="ghost" onClick={onBack} className="-ml-2 text-zinc-900 dark:text-zinc-100">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="flex-1 text-center text-lg font-bold text-zinc-900">크루 설정</h1>
                <div className="w-10" />
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6 pb-28">
                <div className="space-y-6">
                    {/* Crew Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-900">크루 이름</label>
                        <input
                            type="text"
                            value={formData.crewName}
                            onChange={(e) => handleChange('crewName', e.target.value)}
                            disabled={!isPresident}
                            className={`w-full px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-black/5 ${!isPresident ? 'bg-zinc-100 text-zinc-500 cursor-not-allowed' : 'bg-zinc-50'
                                }`}
                        />
                    </div>

                    {/* Crew PIN */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-900">가입 PIN</label>
                        <div className="relative">
                            <input
                                type={showPin ? "text" : "password"}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={pinInput}
                                onChange={handlePinChange}
                                className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-none focus:ring-2 focus:ring-black/5 pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                            >
                                {showPin ? (
                                    <EyeOffIcon className="w-5 h-5" />
                                ) : (
                                    <EyeIcon className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Updated Reservation Scheme */}
                    <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-bold text-zinc-900">예약 오픈 설정</h3>
                        </div>

                        {/* Always Open Checkbox - UI Helper */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isAlwaysOpen"
                                checked={isAlwaysOpen}
                                onChange={(e) => {
                                    setIsAlwaysOpen(e.target.checked);
                                    // Should we reset offset? For now, we keep it as is or default
                                }}
                                className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                            />
                            <label htmlFor="isAlwaysOpen" className="text-sm font-bold text-zinc-900 cursor-pointer">
                                예약 상시 오픈 (날짜 제한 없음)
                            </label>
                        </div>

                        <div className={`space-y-4 ${isAlwaysOpen ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500">오픈 시간</label>
                                    <input
                                        type="time"
                                        value={formData.reservationOpenTime}
                                        onChange={(e) => handleChange('reservationOpenTime', e.target.value)}
                                        disabled={isAlwaysOpen}
                                        className="w-full px-3 py-2 rounded-xl bg-zinc-50 border-none focus:ring-2 focus:ring-black/5 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500">예약 대상 요일</label>
                                    <select
                                        value={formData.reservationOpenDay}
                                        onChange={(e) => handleChange('reservationOpenDay', e.target.value)}
                                        disabled={isAlwaysOpen}
                                        className="w-full px-3 py-2 rounded-xl bg-zinc-50 border-none focus:ring-2 focus:ring-black/5 text-sm"
                                    >
                                        {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(day => (
                                            <option key={day} value={day}>{DAY_TO_KR[day]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-xs font-bold text-zinc-500">오픈일 설정 (D-{formData.reservationOpenOffsetDays})</label>
                                    <span className="text-xs text-zinc-400">{formData.reservationOpenOffsetDays}일 전 오픈</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={formData.reservationOpenOffsetDays}
                                    onChange={(e) => handleChange('reservationOpenOffsetDays', parseInt(e.target.value) || 0)}
                                    disabled={isAlwaysOpen}
                                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border-none focus:ring-2 focus:ring-black/5 text-sm"
                                />
                            </div>

                            {/* Simulated Calendar */}
                            <SimulatedCalendar
                                targetDay={formData.reservationOpenDay}
                                daysBefore={formData.reservationOpenOffsetDays}
                                targetTime={formData.reservationOpenTime}
                            />
                        </div>

                        <div className="pt-2 border-t border-zinc-200 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-500">예약 오픈 요일:</span>
                                <span className="text-lg font-bold text-[#162660]">
                                    {isAlwaysOpen ? '상시 오픈' : (DAY_TO_KR[calculateOpenDay()] || calculateOpenDay())}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Daily Capacity */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-zinc-900">일일 정원</label>
                            <label className="flex items-center gap-2 text-sm text-zinc-500">
                                <input
                                    type="checkbox"
                                    checked={formData.isCapacityLimited}
                                    onChange={(e) => handleChange('isCapacityLimited', e.target.checked)}
                                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                />
                                정원 제한
                            </label>
                        </div>
                        <input
                            type="number"
                            value={formData.dailyCapacity}
                            onChange={(e) => handleChange('dailyCapacity', parseInt(e.target.value) || 0)}
                            disabled={!formData.isCapacityLimited}
                            className={`w-full px-4 py-3 rounded-xl bg-zinc-50 border-none focus:ring-2 focus:ring-black/5 ${!formData.isCapacityLimited ? 'opacity-50' : ''
                                }`}
                        />
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-lg mt-8 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <SaveIcon className="w-5 h-5" />
                        저장하기
                    </button>


                    {/* Manage Managers Button */}
                    {isPresident && (
                        <button
                            onClick={() => setShowPromote(true)}
                            className="w-full py-4 bg-white border-2 border-zinc-100 text-zinc-900 rounded-2xl font-bold text-lg hover:bg-zinc-50 transition-colors"
                        >
                            운영진 관리
                        </button>
                    )}

                    <div className="h-10" />
                </div>
            </main>
        </div>
    );
}




// Helper Simulations
const SimulatedCalendar = ({ targetDay, daysBefore, targetTime }: { targetDay: string, daysBefore: number, targetTime?: string }) => {
    // 1. Calculate Target Dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayMap: { [key: string]: number } = {
        'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
    };

    const targetDayIndex = dayMap[targetDay];

    // Find next target day
    // Logic: The calendar is simulating: "If I set these settings, what happens?"
    // The "Open Day" is defined by (Target Day - daysBefore).
    // Let's assume we are showing the *Next* valid cycle.
    // If Today + daysBefore leads to a date, we find the next TargetDay after that date.

    const minTargetDate = new Date(today);
    minTargetDate.setDate(today.getDate() + daysBefore);

    let diff = (targetDayIndex - minTargetDate.getDay() + 7) % 7;
    let targetStart = new Date(minTargetDate);
    targetStart.setDate(minTargetDate.getDate() + diff);

    // Derived Real Open Date
    const realOpenDate = new Date(targetStart);
    realOpenDate.setDate(targetStart.getDate() - daysBefore);

    // Target End (1 week duration)
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetStart.getDate() + 6);

    // 2. Generate Trimming Range (Relevant Weeks Only)
    // Start from the Sunday of the Open Date's week
    const viewStart = new Date(realOpenDate);
    viewStart.setDate(realOpenDate.getDate() - realOpenDate.getDay());

    // End at the Saturday of the Target End's week
    const viewEnd = new Date(targetEnd);
    viewEnd.setDate(targetEnd.getDate() + (6 - targetEnd.getDay()));

    // Generate dates
    const calendarDays: Date[] = [];
    const current = new Date(viewStart);
    while (current <= viewEnd) {
        calendarDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    // 3. Download Logic
    const handleDownload = () => {
        // Create an SVG string representing the calendar
        const width = 400;
        const cellWidth = width / 7;
        const headerHeight = 40;
        const rowHeight = 60;
        const rows = Math.ceil(calendarDays.length / 7);
        const height = headerHeight + 30 + (rows * rowHeight);

        // Colors
        const bgTarget = "#D0E6FD"; // Light Blue for Target
        const textOpen = "#EF4444";
        const textTarget = "#162660";

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family: sans-serif; background: white;">
            <rect width="100%" height="100%" fill="white"/>
            <text x="${width / 2}" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#18181B">
                ${realOpenDate.getMonth() + 1}월 ${realOpenDate.getDate()}일 예약 오픈 예시
            </text>
            
            <!-- Week Headers -->
            <g transform="translate(0, 45)">
                ${['일', '월', '화', '수', '목', '금', '토'].map((d, i) =>
            `<text x="${i * cellWidth + cellWidth / 2}" y="15" text-anchor="middle" font-size="10" fill="#A1A1AA">${d}</text>`
        ).join('')}
            </g>
            
            <!-- Days -->
            <g transform="translate(0, 70)">
        `;

        calendarDays.forEach((date, i) => {
            const x = (i % 7) * cellWidth;
            const y = Math.floor(i / 7) * rowHeight;

            const isOpenDate = date.toDateString() === realOpenDate.toDateString();
            const curr = new Date(date); curr.setHours(0, 0, 0, 0);
            const tStart = new Date(targetStart); tStart.setHours(0, 0, 0, 0);
            const tEnd = new Date(targetEnd); tEnd.setHours(0, 0, 0, 0);
            const isTargetRange = curr >= tStart && curr <= tEnd;

            // Background
            if (isTargetRange) {
                // Round corners if start/end
                svgContent += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${rowHeight}" fill="${bgTarget}" />`;
            }

            // Date Number
            let fill = "#52525B";
            if (date.getMonth() !== realOpenDate.getMonth() && !isTargetRange) fill = "#D4D4D8";
            if (isTargetRange) fill = textTarget;
            if (isOpenDate) fill = textOpen;

            svgContent += `<text x="${x + cellWidth / 2}" y="${y + 20}" text-anchor="middle" font-size="12" font-weight="${isOpenDate || isTargetRange ? 'bold' : 'normal'}" fill="${fill}">${date.getDate()}</text>`;

            // Open Label / Time
            if (isOpenDate) {
                svgContent += `<rect x="${x + 5}" y="${y + 30}" width="${cellWidth - 10}" height="14" rx="4" fill="${textOpen}" />`;
                svgContent += `<text x="${x + cellWidth / 2}" y="${y + 40}" text-anchor="middle" font-size="8" fill="white" font-weight="bold">OPEN ${targetTime || ''}</text>`;
            }
        });

        svgContent += `</g></svg>`;

        // Conversion
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                const pngUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `reservation_calendar_preview.png`;
                a.click();
            }
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };

    return (
        <div className="bg-white rounded-lg border border-zinc-200 p-3 mt-2">
            <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-bold text-zinc-900">
                    {realOpenDate.getMonth() + 1}월 {realOpenDate.getDate()}일 예약 오픈 예시
                </div>
                <Button variant="ghost" size="small" onClick={handleDownload} className="h-6 text-[10px] px-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600">
                    이미지 다운로드
                </Button>
            </div>

            {/* Week Headers */}
            <div className="grid grid-cols-7 mb-1">
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                    <div key={d} className="text-[10px] text-center text-zinc-400">{d}</div>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-y-1">
                {calendarDays.map((date, idx) => {
                    const isOpenDate = date.toDateString() === realOpenDate.toDateString();

                    const tStart = new Date(targetStart); tStart.setHours(0, 0, 0, 0);
                    const tEnd = new Date(targetEnd); tEnd.setHours(0, 0, 0, 0);
                    const curr = new Date(date); curr.setHours(0, 0, 0, 0);
                    const isTargetRange = curr >= tStart && curr <= tEnd;

                    let bgClass = "bg-transparent";
                    let textClass = "text-zinc-600";

                    // Dim days from other months unless they are relevant
                    if (curr.getMonth() !== realOpenDate.getMonth() && !isTargetRange) {
                        textClass = "text-zinc-300";
                    }

                    if (isTargetRange) {
                        bgClass = "bg-[#D0E6FD]";
                        textClass = "text-[#162660] font-bold";
                        if (curr.getTime() === tStart.getTime()) bgClass += " rounded-l-md";
                        if (curr.getTime() === tEnd.getTime()) bgClass += " rounded-r-md";
                    }

                    return (
                        <div key={idx} className={`relative flex flex-col items-center justify-start py-1 min-h-[50px] ${bgClass} ${textClass}`}>
                            <span className={`text-xs ${isOpenDate ? 'text-red-500 font-bold' : ''}`}>{date.getDate()}</span>
                            {isOpenDate && (
                                <div className="mt-1 flex flex-col items-center">
                                    <span className="text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full leading-none mb-0.5">OPEN</span>
                                    <span className="text-[9px] text-red-500 font-bold leading-none">{targetTime}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
