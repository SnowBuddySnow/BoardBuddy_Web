import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { getOrganizerGroup, listGroupMembers, deleteGroupMember, inviteCrewManager, listGroupInvitations, listOrganizerGroupCrews, revokeOrganizerGroupInvitation } from '../services/organizerGroup';
import { OrganizerGroup, OrganizerGroupCrew, OrganizerGroupInvitation, OrganizerGroupMembership } from '../types/api';
import { ChevronLeft, Trash2, UserPlus, Info, Mail, Users, X } from 'lucide-react';

interface DashboardGroupDetailProps {
    groupId: number;
    onBack: () => void;
}

export default function DashboardGroupDetail({ groupId, onBack }: DashboardGroupDetailProps) {
    const [group, setGroup] = useState<OrganizerGroup | null>(null);
    const [members, setMembers] = useState<OrganizerGroupMembership[]>([]);
    const [crews, setCrews] = useState<OrganizerGroupCrew[]>([]);
    const [invitations, setInvitations] = useState<OrganizerGroupInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Form States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newUserCode, setNewUserCode] = useState('');
    const [newRole, setNewRole] = useState<'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER'>('EVENT_GROUP_MANAGER');

    // Get Simulated Role
    const roleOverride = localStorage.getItem('dev_role_override') || 'server';
    const isViewer = roleOverride === 'member' || roleOverride === 'viewer'; // Read-only role checks

    const fetchData = async () => {
        try {
            setLoading(true);
            const groupData = await getOrganizerGroup(groupId);
            setGroup(groupData);
            const [membersList, crewList, invitationList] = await Promise.all([
                listGroupMembers(groupId),
                listOrganizerGroupCrews(groupId),
                listGroupInvitations(groupId),
            ]);
            setMembers(membersList);
            setCrews(crewList);
            setInvitations(invitationList);
        } catch (error) {
            console.error('Failed to fetch group details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [groupId]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewer) {
            alert('이 그룹의 멤버를 편집할 권한이 없습니다.');
            return;
        }

        const normalizedUserCode = newUserCode.trim().toUpperCase();
        if (!/^US-[A-Z0-9]+$/.test(normalizedUserCode)) {
            alert('올바른 계정 코드를 입력하세요. (예: US-ABC123)');
            return;
        }

        try {
            setActionLoading(true);
            await inviteCrewManager(groupId, normalizedUserCode, newRole);
            alert('크루 운영진에게 초대를 보냈습니다.');
            setNewUserCode('');
            setIsAddOpen(false);
            // Reload member list
            await fetchData();
        } catch (error) {
            console.error('Failed to add member:', error);
            alert('초대에 실패했습니다. 대상 사용자가 활성 크루 운영진인지 확인해 주세요.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteMember = async (userId: number) => {
        if (isViewer) {
            alert('이 그룹의 멤버를 편집할 권한이 없습니다.');
            return;
        }

        const confirmDelete = window.confirm(`정말 유저 #${userId} 멤버를 이 주최자 그룹에서 삭제하시겠습니까?`);
        if (!confirmDelete) return;

        try {
            setActionLoading(true);
            await deleteGroupMember(groupId, userId);
            alert('성공적으로 삭제되었습니다.');
            // Reload member list
            const updatedList = await listGroupMembers(groupId);
            setMembers(updatedList);
        } catch (error) {
            console.error('Failed to delete member:', error);
            alert('멤버 삭제에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevokeInvitation = async (invitationId: number) => {
        try {
            setActionLoading(true);
            await revokeOrganizerGroupInvitation(groupId, invitationId);
            await fetchData();
        } catch (error) {
            console.error('Failed to revoke invitation:', error);
            alert('초대 취소에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'EVENT_GROUP_OWNER':
                return 'bg-amber-50 text-amber-700 border border-amber-200 font-bold';
            case 'EVENT_GROUP_MANAGER':
                return 'bg-blue-50 text-blue-700 border border-blue-200 font-bold';
            case 'EVENT_GROUP_VIEWER':
            default:
                return 'bg-zinc-50 text-zinc-500 border border-zinc-200 font-medium';
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] items-center justify-center text-zinc-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#162660] mb-3"></div>
                <p className="text-sm">그룹 멤버 정보를 불러오는 중...</p>
            </div>
        );
    }

    if (!group) return null;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#FAF8F3] overflow-hidden relative">
            {/* Header */}
            <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="p-2 bg-zinc-50 hover:bg-zinc-100 rounded-full text-zinc-800 shrink-0 border border-zinc-200/50"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-black text-zinc-900 leading-snug">{group.name}</h1>
                        <p className="text-xs text-zinc-400">연합 크루 및 인증 운영진 관리</p>
                    </div>
                </div>

                {!isViewer && (
                    <Button
                        variant="primary"
                        onClick={() => setIsAddOpen(true)}
                        className="bg-[#162660] hover:bg-[#1e3a8a] text-white border-none rounded-full h-10 py-0 font-bold flex items-center gap-1.5 shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        운영진 초대
                    </Button>
                )}
            </header>

            {/* Content Body */}
            <main className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto space-y-6">
                {isViewer && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-zinc-600">
                        <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        <span>귀하는 이 소모임 그룹의 <strong>VIEWER(뷰어)</strong> 권한이므로 멤버 추가 및 삭제 같은 쓰기 작업이 제한됩니다.</span>
                    </div>
                )}

                <section className="border-y border-zinc-200 bg-white px-5 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#162660]" />
                        <h2 className="text-sm font-bold text-zinc-900">참여 크루</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {crews.map(crew => (
                            <span key={crew.id} className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-800">
                                {crew.crewName}
                            </span>
                        ))}
                    </div>
                </section>

                {invitations.some(invitation => invitation.status === 'PENDING') && (
                    <section className="border-y border-zinc-200 bg-white px-5 py-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-zinc-500" />
                            <h2 className="text-sm font-bold text-zinc-900">응답 대기 초대</h2>
                        </div>
                        {invitations.filter(invitation => invitation.status === 'PENDING').map(invitation => (
                            <div key={invitation.id} className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-zinc-700">{invitation.invitedAccountCode} · {invitation.invitedCrewName}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-amber-700">{invitation.proposedRole} · 대기 중</span>
                                    {!isViewer && (
                                        <button
                                            onClick={() => handleRevokeInvitation(invitation.id)}
                                            disabled={actionLoading}
                                            className="w-7 h-7 border border-zinc-200 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                            title="초대 취소"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                <div className="bg-white border border-zinc-100 rounded-3xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50 border-b border-zinc-100 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4">User ID</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Crew</th>
                                    <th className="px-6 py-4">Group Role</th>
                                    {!isViewer && <th className="px-6 py-4 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.id} className="border-b border-zinc-50 text-sm hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-zinc-500 text-xs">#{member.userId}</td>
                                        <td className="px-6 py-4 font-bold text-zinc-800">{member.userName || `User ${member.userId}`}</td>
                                        <td className="px-6 py-4 text-xs font-semibold text-zinc-600">{member.crewName || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider ${getRoleBadgeStyle(member.role)}`}>
                                                {member.role}
                                            </span>
                                        </td>
                                        {!isViewer && (
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleDeleteMember(member.userId)}
                                                    disabled={actionLoading}
                                                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors inline-flex border-none cursor-pointer"
                                                    aria-label="Remove member"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Add Member Drawer Overlay */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white border border-zinc-100 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                            <h3 className="text-base font-bold text-zinc-900">크루 운영진 초대</h3>
                            <button
                                onClick={() => setIsAddOpen(false)}
                                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 cursor-pointer border-none bg-transparent"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">운영진 계정 코드</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserCode}
                                    onChange={(e) => setNewUserCode(e.target.value.toUpperCase())}
                                    placeholder="예: US-ABC123"
                                    className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 focus:border-[#162660] focus:ring-1 focus:ring-[#162660] focus:bg-white text-sm outline-none font-medium"
                                />
                                <p className="px-1 text-[11px] leading-relaxed text-zinc-400">
                                    상대방이 계정 관리 화면의 계정 코드를 공유하면 내부 숫자 ID를 찾지 않고 안전하게 초대할 수 있습니다.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">수락 후 역할</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['EVENT_GROUP_MANAGER', 'EVENT_GROUP_VIEWER'] as const).map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setNewRole(role)}
                                            className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                newRole === role
                                                    ? 'bg-[#162660] text-white border-[#162660] shadow-sm'
                                                    : 'bg-zinc-50 text-zinc-600 border-zinc-200/60 hover:bg-zinc-100'
                                            }`}
                                        >
                                            {role === 'EVENT_GROUP_MANAGER' ? 'Manager' : 'Viewer'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => setIsAddOpen(false)}
                                    className="flex-1 rounded-full h-11 border-zinc-200 text-zinc-600"
                                >
                                    취소
                                </Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 bg-[#162660] hover:bg-blue-900 border-none text-white font-bold rounded-full h-11"
                                >
                                    초대 보내기
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
