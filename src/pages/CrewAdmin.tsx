import axios from 'axios';
import { ChevronLeftIcon, PlusIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { createCrew, getCrewAdminData, type AdminCrew, type AdminSchool } from '../services/crewAdmin';

interface CrewAdminProps {
    onBack: () => void;
}

const DAYS = [
    ['MONDAY', '월요일'],
    ['TUESDAY', '화요일'],
    ['WEDNESDAY', '수요일'],
    ['THURSDAY', '목요일'],
    ['FRIDAY', '금요일'],
    ['SATURDAY', '토요일'],
    ['SUNDAY', '일요일'],
] as const;

const getErrorMessage = (error: unknown) => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || error.message;
    }
    return error instanceof Error ? error.message : '크루를 저장하지 못했습니다.';
};

export default function CrewAdmin({ onBack }: CrewAdminProps) {
    const [crews, setCrews] = useState<AdminCrew[]>([]);
    const [schools, setSchools] = useState<AdminSchool[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [schoolId, setSchoolId] = useState('');
    const [pin, setPin] = useState('');
    const [dailyCapacity, setDailyCapacity] = useState('8');
    const [periodLimit, setPeriodLimit] = useState('7');
    const [capacityLimited, setCapacityLimited] = useState(true);
    const [openingEnabled, setOpeningEnabled] = useState(false);
    const [openingDay, setOpeningDay] = useState('FRIDAY');
    const [openingTime, setOpeningTime] = useState('18:00');
    const [openingOffset, setOpeningOffset] = useState('3');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getCrewAdminData();
            setCrews(data.crews);
            setSchools(data.schools);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!/^\d{4}$/.test(pin)) return;

        setSaving(true);
        setError('');
        try {
            const crew = await createCrew({
                name: name.trim(),
                schoolId: schoolId ? Number(schoolId) : null,
                pin,
                dailyCapacity: Number(dailyCapacity),
                capacityLimited,
                reservationPeriodLimitDays: Number(periodLimit),
                reservationOpenDay: openingEnabled ? openingDay : null,
                reservationOpenTime: openingEnabled ? openingTime : null,
                reservationOpenOffsetDays: openingEnabled ? Number(openingOffset) : null,
                profileImageUrl: null,
            });
            setCrews((current) => [...current, crew].sort((a, b) => a.name.localeCompare(b.name)));
            setName('');
            setPin('');
        } catch (saveError) {
            setError(getErrorMessage(saveError));
        } finally {
            setSaving(false);
        }
    };

    const inputClass = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-700';

    return (
        <div className="flex h-full flex-1 flex-col overflow-hidden bg-zinc-50 text-zinc-900">
            <header className="flex items-center border-b border-zinc-200 bg-white px-4 py-3">
                <Button variant="ghost" onClick={onBack} className="-ml-2">
                    <ChevronLeftIcon className="h-6 w-6" />
                </Button>
                <h1 className="ml-2 text-lg font-bold">크루 관리</h1>
            </header>

            <main className="flex-1 space-y-5 overflow-y-auto p-4">
                {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <PlusIcon className="h-4 w-4" />
                        <h2 className="font-bold">새 크루 추가</h2>
                    </div>

                    <label className="block text-sm font-medium">
                        크루 이름
                        <input required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass} mt-1`} />
                    </label>

                    <label className="block text-sm font-medium">
                        소속 학교
                        <select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} className={`${inputClass} mt-1`}>
                            <option value="">학교 미연계</option>
                            {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                        </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm font-medium">
                            가입 PIN
                            <input required inputMode="numeric" pattern="\d{4}" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} className={`${inputClass} mt-1`} placeholder="4자리" />
                        </label>
                        <label className="block text-sm font-medium">
                            일일 정원
                            <input required type="number" min={1} max={10000} value={dailyCapacity} onChange={(event) => setDailyCapacity(event.target.value)} className={`${inputClass} mt-1`} />
                        </label>
                    </div>

                    <label className="block text-sm font-medium">
                        예약 가능 기간(일)
                        <input required type="number" min={0} max={365} value={periodLimit} onChange={(event) => setPeriodLimit(event.target.value)} className={`${inputClass} mt-1`} />
                    </label>

                    <div className="space-y-2 text-sm">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={capacityLimited} onChange={(event) => setCapacityLimited(event.target.checked)} /> 일일 정원 제한 사용</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={openingEnabled} onChange={(event) => setOpeningEnabled(event.target.checked)} /> 예약 오픈 시간 설정</label>
                    </div>

                    {openingEnabled && (
                        <div className="grid grid-cols-3 gap-2">
                            <select value={openingDay} onChange={(event) => setOpeningDay(event.target.value)} className={inputClass}>
                                {DAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                            <input required type="time" value={openingTime} onChange={(event) => setOpeningTime(event.target.value)} className={inputClass} />
                            <input required aria-label="예약 오픈 기준 일수" type="number" min={0} max={365} value={openingOffset} onChange={(event) => setOpeningOffset(event.target.value)} className={inputClass} />
                        </div>
                    )}

                    <button disabled={saving || loading || schools.length === 0} className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                        {saving ? '저장 중...' : '크루 추가'}
                    </button>
                </form>

                <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-3 font-bold">등록된 크루 ({crews.length})</h2>
                    {loading ? <p className="text-sm text-zinc-500">불러오는 중...</p> : crews.length === 0 ? <p className="text-sm text-zinc-500">등록된 크루가 없습니다.</p> : (
                        <div className="divide-y divide-zinc-100">
                            {crews.map((crew) => (
                                <div key={crew.id} className="flex items-center justify-between py-3 text-sm">
                                    <div><p className="font-semibold">{crew.name}</p><p className="text-zinc-500">{crew.schoolName || '소속 학교 없음'}</p></div>
                                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs">{crew.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
