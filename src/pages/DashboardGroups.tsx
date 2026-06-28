import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { acceptOrganizerGroupInvitation, createOrganizerGroup, declineOrganizerGroupInvitation, listMyOrganizerGroupInvitations, listOrganizerGroups } from '../services/organizerGroup';
import { OrganizerGroup, OrganizerGroupInvitation } from '../types/api';
import { Users, ArrowRight, ShieldAlert, Award, Check, Mail, Plus, X } from 'lucide-react';

interface DashboardGroupsProps {
    onBackToHomeClick: () => void;
    onPartiesClick: () => void;
    onViewGroupDetailClick: (groupId: number) => void;
}

export default function DashboardGroups({
    onBackToHomeClick,
    onPartiesClick,
    onViewGroupDetailClick
}: DashboardGroupsProps) {
    const [groups, setGroups] = useState<OrganizerGroup[]>([]);
    const [invitations, setInvitations] = useState<OrganizerGroupInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const [data, pendingInvitations] = await Promise.all([
                listOrganizerGroups(),
                listMyOrganizerGroupInvitations(),
            ]);
            setGroups(data);
            setInvitations(pendingInvitations);
        } catch (error) {
            console.error('Failed to fetch organizer groups:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleCreateGroup = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newGroupName.trim()) return;
        try {
            setActionLoading(true);
            const created = await createOrganizerGroup(newGroupName.trim());
            setGroups(current => [...current, created]);
            setNewGroupName('');
            setIsCreateOpen(false);
        } catch (error) {
            console.error('Failed to create organizer group:', error);
            alert('활성 크루 운영진만 주최자 그룹을 만들 수 있습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleInvitation = async (invitationId: number, accept: boolean) => {
        try {
            setActionLoading(true);
            if (accept) {
                await acceptOrganizerGroupInvitation(invitationId);
            } else {
                await declineOrganizerGroupInvitation(invitationId);
            }
            await fetchGroups();
        } catch (error) {
            console.error('Failed to respond to organizer group invitation:', error);
            alert('초대 응답에 실패했습니다. 현재 크루 운영진 권한을 확인해 주세요.');
        } finally {
            setActionLoading(false);
        }
    };

    // Helper to mock or determine roles (role is set in simulated mode or determined by group/user relationship)
    const getSimulatedRole = () => {
        const roleOverride = localStorage.getItem('dev_role_override');
        if (roleOverride === 'admin') return 'ADMIN';
        if (roleOverride === 'organizer') return 'OWNER';
        if (roleOverride === 'member') return 'MEMBER';
        return 'EDITOR'; // Default fallback
    };

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'ADMIN':
            case 'OWNER':
                return 'bg-amber-50 text-amber-700 border border-amber-200';
            case 'EDITOR':
                return 'bg-blue-50 text-blue-700 border border-blue-200';
            default:
                return 'bg-zinc-50 text-zinc-500 border border-zinc-200';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] overflow-hidden">
            {/* Top Desktop Navigation */}
            <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-black italic text-[#162660] font-['Joti_One']">BoardBuddy Manager</h1>
                    <span className="h-4 w-px bg-zinc-200"></span>
                    <div className="flex gap-1 bg-zinc-100 p-1 rounded-full text-xs font-bold shrink-0">
                        <button
                            onClick={onPartiesClick}
                            className="px-4 py-1.5 rounded-full text-zinc-500 hover:text-zinc-800 bg-transparent border-none cursor-pointer font-bold"
                        >
                            소모임 관리
                        </button>
                        <button
                            className="px-4 py-1.5 rounded-full bg-[#162660] text-white border-none shadow-sm cursor-default"
                        >
                            <Users className="w-3.5 h-3.5 inline mr-1" /> 그룹 관리
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="primary"
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-[#162660] text-white border-none rounded-full h-10 py-0 font-bold flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" /> 그룹 만들기
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onBackToHomeClick}
                        className="rounded-full border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-medium h-10 py-0"
                    >
                        모바일 홈으로
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
                <div className="flex flex-col gap-6">
                    {invitations.length > 0 && (
                        <section className="border-y border-zinc-200 bg-white px-5 py-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-[#162660]" />
                                <h2 className="text-sm font-bold text-zinc-900">받은 운영진 초대</h2>
                            </div>
                            {invitations.map(invitation => (
                                <div key={invitation.id} className="flex items-center justify-between gap-4 text-sm">
                                    <div className="min-w-0">
                                        <p className="font-bold text-zinc-800 truncate">{invitation.groupName}</p>
                                        <p className="text-xs text-zinc-500">{invitation.invitedCrewName} · {invitation.proposedRole}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleInvitation(invitation.id, false)}
                                            disabled={actionLoading}
                                            className="w-8 h-8 border border-zinc-200 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-50"
                                            title="초대 거절"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleInvitation(invitation.id, true)}
                                            disabled={actionLoading}
                                            className="w-8 h-8 border border-emerald-200 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-100"
                                            title="초대 수락"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}
                    <div>
                        <h2 className="text-2xl font-black text-zinc-950">주최자 그룹 설정</h2>
                        <p className="text-sm text-zinc-500 mt-1">내가 가입되어 있고 소모임을 주최할 권한이 있는 그룹 목록입니다.</p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 text-zinc-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                            <p className="text-sm">그룹 정보를 가져오는 중...</p>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="bg-white border border-zinc-100 rounded-3xl p-16 text-center text-zinc-400 shadow-sm flex flex-col items-center justify-center max-w-2xl mx-auto mt-12">
                            <ShieldAlert className="w-16 h-16 stroke-[1.2] mb-3 text-zinc-300" />
                            <h2 className="text-xl font-bold text-zinc-900 mb-1">가입된 그룹이 없습니다</h2>
                            <p className="text-sm max-w-md mt-1 mb-6">
                                현재 소모임을 생성하거나 멤버 관리를 수행할 수 있는 권한 그룹이 존재하지 않습니다.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groups.map((group) => {
                                const role = getSimulatedRole();
                                return (
                                    <div 
                                        key={group.id} 
                                        className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-zinc-200/80 transition-all flex flex-col justify-between gap-4"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 bg-zinc-50 rounded-2xl border border-zinc-100/60 w-max text-[#162660]">
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider ${getRoleBadgeStyle(role)}`}>
                                                    {role}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-zinc-900 leading-snug">{group.name}</h3>
                                                <p className="text-xs text-zinc-400 mt-1">그룹 ID: #{group.id}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="border-t border-zinc-50 pt-4 flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400">
                                                <Award className="w-3.5 h-3.5 text-zinc-400" />
                                                <span>운영진 관리 가능</span>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                onClick={() => onViewGroupDetailClick(group.id)}
                                                className="text-[#162660] hover:bg-zinc-50 hover:text-blue-900 font-bold text-xs flex items-center gap-1 px-3 py-1.5 rounded-full"
                                            >
                                                <span>멤버 관리</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/30 z-[9999] flex items-center justify-center p-4">
                    <form onSubmit={handleCreateGroup} className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-zinc-900">주최자 그룹 만들기</h2>
                            <button type="button" onClick={() => setIsCreateOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700" title="닫기">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-500">그룹 이름</label>
                            <input
                                value={newGroupName}
                                onChange={event => setNewGroupName(event.target.value)}
                                maxLength={100}
                                required
                                placeholder="예: 수도권 연합 운영진"
                                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#162660]/20"
                            />
                        </div>
                        <Button type="submit" disabled={actionLoading} className="w-full bg-[#162660] text-white border-none rounded-xl h-11 font-bold">
                            만들기
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}
