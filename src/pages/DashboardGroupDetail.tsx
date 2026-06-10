import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { getOrganizerGroup, listGroupMembers, addGroupMember, deleteGroupMember } from '../services/party';
import { OrganizerGroup, OrganizerGroupMembership } from '../types/api';
import { ChevronLeft, Plus, Trash2, Shield, UserPlus, Info, Check, X } from 'lucide-react';

interface DashboardGroupDetailProps {
    groupId: number;
    onBack: () => void;
}

export default function DashboardGroupDetail({ groupId, onBack }: DashboardGroupDetailProps) {
    const [group, setGroup] = useState<OrganizerGroup | null>(null);
    const [members, setMembers] = useState<OrganizerGroupMembership[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Form States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newUserId, setNewUserId] = useState('');
    const [newRole, setNewRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER'>('VIEWER');

    // Get Simulated Role
    const roleOverride = localStorage.getItem('dev_role_override') || 'server';
    const isViewer = roleOverride === 'member' || roleOverride === 'viewer'; // Read-only role checks

    const fetchData = async () => {
        try {
            setLoading(true);
            const groupData = await getOrganizerGroup(groupId);
            setGroup(groupData);
            const membersList = await listGroupMembers(groupId);
            setMembers(membersList);
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

        const userIdNum = parseInt(newUserId, 10);
        if (isNaN(userIdNum)) {
            alert('올바른 유저 ID(숫자)를 입력하세요.');
            return;
        }

        try {
            setActionLoading(true);
            await addGroupMember(groupId, userIdNum, newRole);
            alert('멤버가 성공적으로 추가되었습니다.');
            setNewUserId('');
            setIsAddOpen(false);
            // Reload member list
            const updatedList = await listGroupMembers(groupId);
            setMembers(updatedList);
        } catch (error) {
            console.error('Failed to add member:', error);
            alert('멤버 추가에 실패했습니다.');
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

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'OWNER':
                return 'bg-amber-50 text-amber-700 border border-amber-200 font-bold';
            case 'EDITOR':
                return 'bg-blue-50 text-blue-700 border border-blue-200 font-bold';
            case 'VIEWER':
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
                        <p className="text-xs text-zinc-400">그룹 관리자 및 멤버 권한 설정</p>
                    </div>
                </div>

                {!isViewer && (
                    <Button
                        variant="primary"
                        onClick={() => setIsAddOpen(true)}
                        className="bg-[#162660] hover:bg-[#1e3a8a] text-white border-none rounded-full h-10 py-0 font-bold flex items-center gap-1.5 shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        운영진 추가
                    </Button>
                )}
            </header>

            {/* Content Body */}
            <main className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto space-y-6">
                {isViewer && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-zinc-600">
                        <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        <span>귀하는 이 주최그룹의 <strong>VIEWER(뷰어)</strong> 권한이므로 멤버 추가, 역할 변경 및 강퇴 작업 등의 쓰기 권한이 제한됩니다.</span>
                    </div>
                )}

                <div className="bg-white border border-zinc-100 rounded-3xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50 border-b border-zinc-100 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4">User ID</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Group Role</th>
                                    {!isViewer && <th className="px-6 py-4 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.id} className="border-b border-zinc-50 text-sm hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-zinc-500 text-xs">#{member.userId}</td>
                                        <td className="px-6 py-4 font-bold text-zinc-800">{member.userName || `User ${member.userId}`}</td>
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
                            <h3 className="text-base font-bold text-zinc-900">운영진 추가</h3>
                            <button
                                onClick={() => setIsAddOpen(false)}
                                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 cursor-pointer border-none bg-transparent"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">유저 ID (User ID)</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserId}
                                    onChange={(e) => setNewUserId(e.target.value)}
                                    placeholder="예: 12"
                                    className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 focus:border-[#162660] focus:ring-1 focus:ring-[#162660] focus:bg-white text-sm outline-none font-medium"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">부여할 역할 (Group Role)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['OWNER', 'EDITOR', 'VIEWER'] as const).map((role) => (
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
                                            {role === 'OWNER' ? 'Owner' : role === 'EDITOR' ? 'Editor' : 'Viewer'}
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
                                    추가하기
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
