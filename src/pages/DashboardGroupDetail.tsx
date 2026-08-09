import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import {
    addOrganizerGroupMemberDirectly,
    createOrganizerInviteLink,
    deleteGroupMember,
    getOrganizerGroup,
    listGroupMembers,
    listOrganizerGroupCrews,
    listOrganizerInviteLinks,
    revokeOrganizerInviteLink,
    searchOrganizerDirectAddCandidates,
} from '../services/organizerGroup';
import {
    OrganizerDirectAddCandidate,
    OrganizerGroup,
    OrganizerGroupCrew,
    OrganizerGroupInviteLink,
    OrganizerGroupMembership,
} from '../types/api';
import { ChevronLeft, Copy, Info, Link2, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { getApiErrorMessage } from '../lib/apiError';

interface DashboardGroupDetailProps {
    groupId: number;
    developerAccess: boolean;
    onBack: () => void;
}

export default function DashboardGroupDetail({ groupId, developerAccess, onBack }: DashboardGroupDetailProps) {
    const [group, setGroup] = useState<OrganizerGroup | null>(null);
    const [members, setMembers] = useState<OrganizerGroupMembership[]>([]);
    const [crews, setCrews] = useState<OrganizerGroupCrew[]>([]);
    const [inviteLinks, setInviteLinks] = useState<OrganizerGroupInviteLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Form States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addMode, setAddMode] = useState<'link' | 'direct'>('link');
    const [newRole, setNewRole] = useState<'EVENT_GROUP_MANAGER' | 'EVENT_GROUP_VIEWER'>('EVENT_GROUP_MANAGER');
    const [expiresInHours, setExpiresInHours] = useState(168);
    const [maxUses, setMaxUses] = useState<number | null>(1);
    const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
    const [copyComplete, setCopyComplete] = useState(false);
    const [candidateQuery, setCandidateQuery] = useState('');
    const [candidates, setCandidates] = useState<OrganizerDirectAddCandidate[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<OrganizerDirectAddCandidate | null>(null);
    const [candidateLoading, setCandidateLoading] = useState(false);

    // Get Simulated Role
    const roleOverride = localStorage.getItem('dev_role_override') || 'server';
    const isViewer = roleOverride === 'member' || roleOverride === 'viewer'; // Read-only role checks

    const fetchData = async () => {
        try {
            setLoading(true);
            const groupData = await getOrganizerGroup(groupId);
            setGroup(groupData);
            const [membersList, crewList, links] = await Promise.all([
                listGroupMembers(groupId),
                listOrganizerGroupCrews(groupId),
                listOrganizerInviteLinks(groupId),
            ]);
            setMembers(membersList);
            setCrews(crewList);
            setInviteLinks(links);
        } catch (error) {
            console.error('Failed to fetch group details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [groupId]);

    useEffect(() => {
        if (!isAddOpen || addMode !== 'direct' || candidateQuery.trim().length < 2) {
            setCandidates([]);
            setSelectedCandidate(null);
            return;
        }
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                setCandidateLoading(true);
                const result = await searchOrganizerDirectAddCandidates(groupId, candidateQuery.trim());
                if (!cancelled) setCandidates(result);
            } catch (error) {
                console.error('Failed to search direct-add candidates:', error);
                if (!cancelled) setCandidates([]);
            } finally {
                if (!cancelled) setCandidateLoading(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [addMode, candidateQuery, groupId, isAddOpen]);

    const closeAddModal = () => {
        setIsAddOpen(false);
        setGeneratedInviteUrl('');
        setCandidateQuery('');
        setCandidates([]);
        setSelectedCandidate(null);
    };

    const handleCreateInviteLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewer) {
            alert('이 그룹의 멤버를 편집할 권한이 없습니다.');
            return;
        }

        try {
            setActionLoading(true);
            const created = await createOrganizerInviteLink(groupId, {
                role: newRole,
                expiresInHours,
                maxUses,
            });
            const url = new URL(window.location.origin);
            url.searchParams.set('organizerInvite', created.token);
            setGeneratedInviteUrl(url.toString());
            setCopyComplete(false);
            setInviteLinks((current) => [created.inviteLink, ...current]);
        } catch (error: unknown) {
            console.error('Failed to create organizer invite link:', error);
            const apiMessage = getApiErrorMessage(error);
            if (apiMessage?.includes('owner')) {
                alert('그룹 OWNER만 새 운영진을 초대할 수 있습니다.');
            } else {
                alert(apiMessage ? `링크 생성에 실패했습니다: ${apiMessage}` : '초대 링크 생성에 실패했습니다.');
            }
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

    const handleDirectAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCandidate) return;
        try {
            setActionLoading(true);
            const added = await addOrganizerGroupMemberDirectly(groupId, selectedCandidate, newRole);
            setMembers(current => [...current, added]);
            setCrews(current => current.some(crew => crew.crewId === selectedCandidate.crewId)
                ? current
                : [...current, {
                    id: Date.now(),
                    crewId: selectedCandidate.crewId,
                    crewName: selectedCandidate.crewName,
                }]);
            closeAddModal();
        } catch (error: unknown) {
            console.error('Failed to add organizer group member directly:', error);
            const message = getApiErrorMessage(error);
            alert(message ? `직접 추가에 실패했습니다: ${message}` : '운영진을 직접 추가하지 못했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevokeInviteLink = async (inviteLinkId: number) => {
        try {
            setActionLoading(true);
            await revokeOrganizerInviteLink(groupId, inviteLinkId);
            await fetchData();
        } catch (error) {
            console.error('Failed to revoke invitation:', error);
            alert('초대 취소에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCopyInviteUrl = async () => {
        await navigator.clipboard.writeText(generatedInviteUrl);
        setCopyComplete(true);
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
                        onClick={() => {
                            setAddMode('link');
                            setIsAddOpen(true);
                        }}
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

                {inviteLinks.length > 0 && (
                    <section className="border-y border-zinc-200 bg-white px-5 py-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-zinc-500" />
                            <h2 className="text-sm font-bold text-zinc-900">운영진 초대 링크</h2>
                        </div>
                        {inviteLinks.map(link => (
                            <div key={link.id} className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3 first:border-0 first:pt-0 text-sm">
                                <div className="min-w-0">
                                    <p className="font-semibold text-zinc-700">
                                        {link.proposedRole === 'EVENT_GROUP_MANAGER' ? 'Manager' : 'Viewer'}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-400">
                                        {new Date(link.expiresAt).toLocaleString('ko-KR')} 만료
                                        {' · '}
                                        {link.usedCount}/{link.maxUses ?? '∞'}회 사용
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${
                                        link.status === 'ACTIVE' ? 'text-emerald-700' : 'text-zinc-400'
                                    }`}>
                                        {link.status}
                                    </span>
                                    {!isViewer && link.status === 'ACTIVE' && (
                                        <button
                                            onClick={() => handleRevokeInviteLink(link.id)}
                                            disabled={actionLoading}
                                            className="w-7 h-7 border border-zinc-200 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                            title="링크 폐기"
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

            {/* Add organizer overlay */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-zinc-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                            <div>
                                <h3 className="text-base font-bold text-zinc-900">운영진 추가</h3>
                                <p className="mt-1 text-xs text-zinc-400">
                                    {addMode === 'link' ? '링크를 공유해 참여를 요청합니다.' : '검색한 운영진을 그룹에 바로 추가합니다.'}
                                </p>
                            </div>
                            <button
                                onClick={closeAddModal}
                                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-100 cursor-pointer border-none bg-transparent"
                                aria-label="닫기"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {developerAccess && (
                            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-zinc-100 p-1">
                                {([
                                    ['link', '초대 링크'],
                                    ['direct', '직접 추가'],
                                ] as const).map(([mode, label]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => {
                                            setAddMode(mode);
                                            setGeneratedInviteUrl('');
                                            setCandidateQuery('');
                                            setSelectedCandidate(null);
                                        }}
                                        className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                                            addMode === mode ? 'bg-white text-[#162660] shadow-sm' : 'text-zinc-500'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {addMode === 'link' ? (
                          <form onSubmit={handleCreateInviteLink} className="space-y-4">
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

                            <div className="grid grid-cols-2 gap-3">
                                <label className="space-y-1.5">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">링크 만료</span>
                                    <select
                                        value={expiresInHours}
                                        onChange={(event) => setExpiresInHours(Number(event.target.value))}
                                        className="w-full px-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm outline-none"
                                    >
                                        <option value={24}>24시간</option>
                                        <option value={168}>7일</option>
                                        <option value={720}>30일</option>
                                    </select>
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">사용 횟수</span>
                                    <select
                                        value={maxUses == null ? 'unlimited' : maxUses}
                                        onChange={(event) => setMaxUses(
                                            event.target.value === 'unlimited' ? null : Number(event.target.value),
                                        )}
                                        className="w-full px-3 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm outline-none"
                                    >
                                        <option value={1}>1회</option>
                                        <option value={5}>5회</option>
                                        <option value="unlimited">제한 없음</option>
                                    </select>
                                </label>
                            </div>

                            {generatedInviteUrl && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                                    <p className="text-xs font-bold text-emerald-800">링크가 생성되었습니다</p>
                                    <div className="mt-2 flex gap-2">
                                        <input
                                            readOnly
                                            value={generatedInviteUrl}
                                            className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-zinc-700"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCopyInviteUrl}
                                            className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            {copyComplete ? '복사됨' : '복사'}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-[11px] text-emerald-700">보안을 위해 이 링크는 지금만 다시 복사할 수 있습니다.</p>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={closeAddModal}
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
                                    {generatedInviteUrl ? '새 링크 만들기' : '안전한 링크 생성'}
                                </Button>
                            </div>
                          </form>
                        ) : (
                          <form onSubmit={handleDirectAdd} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">운영진 검색</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        value={candidateQuery}
                                        onChange={event => setCandidateQuery(event.target.value)}
                                        placeholder="이름 또는 크루명 입력"
                                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#162660]"
                                    />
                                </div>
                                {candidateQuery.trim().length < 2 && (
                                    <p className="px-1 text-[11px] text-zinc-400">두 글자 이상 입력해 주세요.</p>
                                )}
                            </div>

                            {candidateQuery.trim().length >= 2 && (
                                <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-zinc-100 p-2">
                                    {candidateLoading ? (
                                        <p className="py-6 text-center text-xs text-zinc-400">검색 중...</p>
                                    ) : candidates.length === 0 ? (
                                        <p className="py-6 text-center text-xs text-zinc-400">추가할 수 있는 운영진이 없습니다.</p>
                                    ) : candidates.map(candidate => (
                                        <button
                                            key={candidate.accountId}
                                            type="button"
                                            onClick={() => setSelectedCandidate(candidate)}
                                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                                                selectedCandidate?.accountId === candidate.accountId
                                                    ? 'border-[#162660] bg-blue-50'
                                                    : 'border-zinc-100 bg-white hover:bg-zinc-50'
                                            }`}
                                        >
                                            <span className="block text-sm font-bold text-zinc-900">{candidate.displayName}</span>
                                            <span className="mt-1 block text-xs text-zinc-500">
                                                {candidate.crewName}
                                                {candidate.crewRole === 'CREW_CAPTAIN' && ' · CAPTAIN'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">추가할 역할</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['EVENT_GROUP_MANAGER', 'EVENT_GROUP_VIEWER'] as const).map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setNewRole(role)}
                                            className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                                                newRole === role
                                                    ? 'border-[#162660] bg-[#162660] text-white'
                                                    : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                                            }`}
                                        >
                                            {role === 'EVENT_GROUP_MANAGER' ? 'Manager' : 'Viewer'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                                선택한 운영진은 별도의 수락 과정 없이 이 그룹에 바로 추가됩니다.
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" type="button" onClick={closeAddModal} className="h-11 flex-1 rounded-full border-zinc-200 text-zinc-600">
                                    취소
                                </Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={!selectedCandidate || actionLoading}
                                    className="h-11 flex-1 rounded-full border-none bg-[#162660] font-bold text-white disabled:bg-zinc-300"
                                >
                                    바로 추가
                                </Button>
                            </div>
                          </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
