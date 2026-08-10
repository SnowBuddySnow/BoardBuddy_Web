import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { listDashboardParties, updateEvent, deleteEvent } from '../services/event';
import { Event } from '../types/api';
import { Plus, Edit2, Play, Power, Trash2, Users, ShieldAlert } from 'lucide-react';
import { getApiErrorStatus } from '../lib/apiError';
import { PlanningModeBadge } from '../components/event/PlanningModeBadge';
import boardBuddyLogo from '../assets/boardbuddy-logo.png';
import { eventStatusLabel, joinPolicyLabel, visibilityTypeLabel } from '../constants/displayLabels';

interface DashboardPartiesProps {
    onCreateEventClick: () => void;
    onEditEventClick: (eventId: number) => void;
    onViewDetailClick: (eventId: number) => void;
    onBackToHomeClick: () => void;
    onGroupsClick: () => void;
}

export default function DashboardParties({
    onCreateEventClick,
    onEditEventClick,
    onViewDetailClick,
    onBackToHomeClick,
    onGroupsClick
}: DashboardPartiesProps) {
    const [parties, setParties] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    const fetchManagedParties = async () => {
        try {
            setLoading(true);
            const data = await listDashboardParties();
            setParties(data);
        } catch (error) {
            console.error('Failed to fetch dashboard parties:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchManagedParties();
    }, []);

    const handleOpenRegistration = async (eventId: number) => {
        try {
            setActionLoadingId(eventId);
            await updateEvent(eventId, { status: 'OPEN' });
            alert('소모임이 오픈되었습니다! 일반 멤버들의 참여 신청을 받습니다.');
            fetchManagedParties();
        } catch (error) {
            console.error('Failed to open registration:', error);
            alert('소모임 오픈 처리에 실패했습니다.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleCloseRegistration = async (eventId: number) => {
        try {
            setActionLoadingId(eventId);
            await updateEvent(eventId, { status: 'CLOSED' });
            alert('소모임 모집이 마감되었습니다.');
            fetchManagedParties();
        } catch (error) {
            console.error('Failed to close registration:', error);
            alert('소모임 마감 처리에 실패했습니다.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDelete = async (eventId: number) => {
        const confirmDelete = window.confirm('정말 이 소모임을 삭제하시겠습니까? 삭제된 정보는 복구할 수 없습니다.');
        if (!confirmDelete) return;

        try {
            setActionLoadingId(eventId);
            await deleteEvent(eventId);
            alert('소모임이 성공적으로 삭제되었습니다.');
            fetchManagedParties();
        } catch (error: unknown) {
            console.error('Failed to delete event:', error);
            if (getApiErrorStatus(error) === 403) {
                alert('이 소모임을 관리할 권한이 없습니다.');
            } else {
                alert('소모임 삭제에 실패했습니다.');
            }
        } finally {
            setActionLoadingId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
            case 'OPEN':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
            case 'CLOSED':
                return 'bg-zinc-50 text-zinc-500 border-zinc-200 font-medium';
            case 'CANCELLED':
                return 'bg-red-50 text-red-600 border-red-200 font-medium';
            default:
                return 'bg-zinc-100 text-zinc-800 border-zinc-200';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] overflow-hidden">
            {/* Top Desktop Navigation */}
            <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex h-8 items-center gap-2"><img src={boardBuddyLogo} alt="BoardBuddy" className="h-8 w-32 object-cover object-center" /><span className="text-sm font-black text-[#162660]">운영</span></div>
                    <span className="h-4 w-px bg-zinc-200"></span>
                    <div className="flex gap-1 bg-zinc-100 p-1 rounded-full text-xs font-bold shrink-0">
                        <button
                            className="px-4 py-1.5 rounded-full bg-[#162660] text-white border-none shadow-sm cursor-default"
                        >
                            소모임 관리
                        </button>
                        <button
                            onClick={onGroupsClick}
                            className="px-4 py-1.5 rounded-full text-zinc-500 hover:text-zinc-800 bg-transparent border-none cursor-pointer font-bold"
                        >
                            그룹 관리
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={onBackToHomeClick}
                        className="rounded-full border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-medium h-10 py-0"
                    >
                        모바일 홈으로
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onCreateEventClick}
                        className="bg-[#162660] hover:bg-[#1e3a8a] text-white border-none rounded-full h-10 py-0 font-bold flex items-center gap-1.5 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        새 소모임 만들기
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 text-zinc-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                        <p className="text-sm">소모임 관리 데이터를 가져오는 중...</p>
                    </div>
                ) : parties.length === 0 ? (
                    <div className="bg-white border border-zinc-100 rounded-3xl p-16 text-center text-zinc-400 shadow-sm flex flex-col items-center justify-center max-w-2xl mx-auto mt-12">
                        <ShieldAlert className="w-16 h-16 stroke-[1.2] mb-3 text-zinc-300" />
                        <h2 className="text-xl font-bold text-zinc-900 mb-1">관리 중인 소모임이 없습니다</h2>
                        <p className="text-sm max-w-md mt-1 mb-6">
                            주최자 그룹에서 등록한 소모임이 아직 없습니다. 새로운 소모임을 직접 개설해보세요.
                        </p>
                        <Button
                            variant="primary"
                            onClick={onCreateEventClick}
                            className="bg-[#162660] rounded-full font-bold px-6"
                        >
                            첫 번째 소모임 개설하기
                        </Button>
                    </div>
                ) : (
                    <div className="bg-white border border-zinc-100 rounded-3xl shadow-sm overflow-hidden">
                        {/* Table layout for Desktop */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50 border-b border-zinc-100 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4">소모임 / 그룹</th>
                                        <th className="px-6 py-4">상태</th>
                                        <th className="px-6 py-4">시작 일시</th>
                                        <th className="px-6 py-4">공개 / 신청 정책</th>
                                        <th className="px-6 py-4">참여 / 정원</th>
                                        <th className="px-6 py-4 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50 text-sm text-zinc-700">
                                    {parties.map(event => {
                                        const isDraft = event.status === 'DRAFT';
                                        const isOpen = event.status === 'OPEN';
                                        const isDisabled = actionLoadingId === event.id;

                                        return (
                                            <tr key={event.id} className="hover:bg-zinc-50/50 transition-colors">
                                                <td className="px-6 py-4.5">
                                                    <div className="font-bold text-zinc-900 hover:text-[#162660] cursor-pointer" onClick={() => onViewDetailClick(event.id)}>
                                                        {event.title}
                                                    </div>
                                                    <div className="text-xs text-zinc-400 font-medium mt-1">
                                                        그룹: {event.organizerGroupName || `ID ${event.organizerGroupId}`}
                                                    </div>
                                                    <div className="mt-2"><PlanningModeBadge mode={event.planningMode} /></div>
                                                </td>
                                                <td className="px-6 py-4.5">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${getStatusStyle(event.status)}`}>
                                                        {eventStatusLabel[event.status]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4.5 font-medium text-zinc-500">
                                                    {formatDate(event.startsAt)}
                                                </td>
                                                <td className="px-6 py-4.5">
                                                    <div className="font-semibold text-zinc-800">{visibilityTypeLabel[event.visibilityType]}</div>
                                                    <div className="text-xs text-zinc-400 font-medium mt-0.5">{joinPolicyLabel[event.joinPolicy]}</div>
                                                </td>
                                                <td className="px-6 py-4.5">
                                                    <div className="flex items-center gap-2 font-bold text-zinc-800">
                                                        <Users className="w-4 h-4 text-zinc-400" />
                                                        <span>{event.joinedCount || 0} / {event.capacity} 명</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4.5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Quick status transitions */}
                                                        {isDraft && (
                                                            <Button
                                                                variant="outline"
                                                                size="small"
                                                                onClick={() => handleOpenRegistration(event.id)}
                                                                disabled={isDisabled}
                                                                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-full font-bold text-xs"
                                                            >
                                                                <Play className="w-3.5 h-3.5 inline mr-1" /> 오픈
                                                            </Button>
                                                        )}
                                                        {isOpen && (
                                                            <Button
                                                                variant="outline"
                                                                size="small"
                                                                onClick={() => handleCloseRegistration(event.id)}
                                                                disabled={isDisabled}
                                                                className="border-zinc-200 text-zinc-500 hover:bg-zinc-100 rounded-full font-semibold text-xs"
                                                            >
                                                                <Power className="w-3.5 h-3.5 inline mr-1" /> 마감
                                                            </Button>
                                                        )}

                                                        <Button
                                                            variant="outline"
                                                            size="small"
                                                            onClick={() => onViewDetailClick(event.id)}
                                                            className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-full font-semibold text-xs"
                                                        >
                                                            상세
                                                        </Button>

                                                        <Button
                                                            variant="outline"
                                                            size="small"
                                                            onClick={() => onEditEventClick(event.id)}
                                                            disabled={isDisabled}
                                                            className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-full font-semibold text-xs"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="small"
                                                            onClick={() => handleDelete(event.id)}
                                                            disabled={isDisabled}
                                                            className="text-red-500 hover:bg-red-50 hover:text-red-700 rounded-full p-2"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
