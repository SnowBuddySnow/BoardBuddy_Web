import { Button } from '../components/Button';
import { ChevronLeftIcon, Trash2Icon, CheckIcon, XIcon, UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getUserInfo } from '../services/user';
import { getCrewInfo, getCrewManagers, getCrewMembers, getApplicants, manageApplicant } from '../services/crew';
import { CrewApplicant } from '../types/api';
import { type CrewRole, normalizeCrewRole } from '../constants/crewRole';

interface CrewMemberProps {
    onBack: () => void;
}

interface Member {
    id: string;
    name: string;
    role: CrewRole;
    studentId: string;
}

interface Applicant {
    id: string; // This is application_id
    name: string;
    userType: 'GENERAL' | 'REGULAR' | 'KUSBF';
    schoolName: string;
    studentId: string;
    requestDate: string;
    userId: number; // Keep track of user ID for adding to member list locally if needed
}

export default function CrewMember({ onBack }: CrewMemberProps) {
    const [currentUserRole, setCurrentUserRole] = useState<'CREW_MANAGER' | 'CREW_MEMBER'>('CREW_MEMBER');

    const [activeTab, setActiveTab] = useState<'members' | 'applicants'>('members');
    const [members, setMembers] = useState<Member[]>([]);
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [crewId, setCrewId] = useState<number | null>(null);

    const refreshData = async () => {
        setLoading(true);
        try {
            const userData = await getUserInfo();
            const currentUserId = userData.userId;

            if (userData.crew) {
                const cId = userData.crew.crewId;
                setCrewId(cId);

                // Fetch basic crew data first
                const [crewInfo, managers, regularMembers] = await Promise.all([
                    getCrewInfo(cId),
                    getCrewManagers(cId),
                    getCrewMembers(cId)
                ]);

                console.log("DEBUG: UserData", userData);
                console.log("DEBUG: CrewInfo", crewInfo);
                console.log("DEBUG: Managers", managers);
                console.log("DEBUG: RegularMembers", regularMembers);

                // Determine Role
                let isAdmin = false;
                if (Array.isArray(managers)) {
                    // Check if current user is in the managers list
                    if (managers.some(m => m.user_id === currentUserId)) {
                        isAdmin = true;
                    }
                }
                // Fallback check for president by name if not in managers list (though they should be)
                if (crewInfo && crewInfo.president_name === userData.name) {
                    isAdmin = true;
                }

                console.log("DEBUG: Is Admin?", isAdmin);

                setCurrentUserRole(isAdmin ? 'CREW_MANAGER' : 'CREW_MEMBER');

                // Conditionally fetch applicants if Admin
                let apiApplicants: CrewApplicant[] = [];
                if (isAdmin) {
                    try {
                        apiApplicants = await getApplicants(cId);
                        console.log("DEBUG: Applicants", apiApplicants);
                    } catch (err) {
                        console.error("Failed to fetch applicants", err);
                        // Don't crash overall if just applicants fail
                    }
                }

                // ... Process Members ...
                const combinedMembers: Member[] = [];
                const presidentName = crewInfo?.president_name;
                let presidentFound = false;

                // 1. Process Managers
                if (Array.isArray(managers)) {
                    managers.forEach(m => {
                        if (!m.user_id) return;

                        if (m.name === presidentName) {
                            combinedMembers.push({
                                id: m.user_id.toString(),
                                name: m.name,
                                role: 'CREW_CAPTAIN',
                                studentId: m.student_id
                            });
                            presidentFound = true;
                        } else {
                            combinedMembers.push({
                                id: m.user_id.toString(),
                                name: m.name,
                                role: normalizeCrewRole(m.role),
                                studentId: m.student_id
                            });
                        }
                    });
                }

                // 2. Add President placeholder if missing
                if (presidentName && !presidentFound) {
                    combinedMembers.unshift({
                        id: 'president',
                        name: presidentName,
                        role: 'CREW_CAPTAIN',
                        studentId: ''
                    });
                }

                // 3. Add Members
                if (Array.isArray(regularMembers)) {
                    regularMembers.forEach(m => {
                        if (m.name !== presidentName && m.user_id) {
                            // Check if this member is NOT in the managers list (avoid duplicates)
                            const isManager = managers.some(mgr => mgr.user_id === m.user_id);
                            if (!isManager) {
                                combinedMembers.push({
                                    id: m.user_id.toString(),
                                    name: m.name,
                                    role: 'CREW_MEMBER',
                                    studentId: m.student_id
                                });
                            }
                        }
                    });
                }
                console.log("DEBUG: Combined Members", combinedMembers);
                setMembers(combinedMembers);

                // Process Applicants
                if (isAdmin && Array.isArray(apiApplicants)) {
                    const mappedApplicants: Applicant[] = apiApplicants
                        .filter(app => app.applicationId != null && app.status === 'PENDING')
                        .map(app => ({
                            id: app.applicationId.toString(),
                            name: app.userName,
                            userType: app.userType,
                            schoolName: app.schoolName,
                            studentId: app.studentId,
                            requestDate: app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Unknown',
                            userId: app.userId
                        }));
                    setApplicants(mappedApplicants);
                } else {
                    setApplicants([]);
                }

            }
        } catch (err) {
            console.error("Failed to fetch crew data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleDeleteMember = (id: string, name: string) => {
        if (window.confirm(`${name}님을 크루에서 삭제하시겠습니까?`)) {
            // TODO: Implement delete API
            setMembers(members.filter(m => m.id !== id));
        }
    };

    const handleAcceptApplicant = async (appId: string) => {
        if (!crewId) return;
        const applicant = applicants.find(item => item.id === appId);
        if (!applicant) return;
        if (applicant.userType === 'KUSBF') {
            const identity = [applicant.name, applicant.schoolName, applicant.studentId || '학번 미등록']
                .filter(Boolean)
                .join(' · ');
            if (!window.confirm(`${identity}\n\n실명과 재학 여부를 크루의 실제 명단과 대조했나요?`)) return;
        }
        try {
            await manageApplicant(crewId, parseInt(appId), 1);
            // Optimistic update or refresh
            if (applicant) {
                // Add to members list locally for immediate feedback
                setMembers([...members, {
                    id: applicant.userId.toString(),
                    name: applicant.name,
                    role: 'CREW_MEMBER',
                    studentId: applicant.studentId
                }]);
                setApplicants(applicants.filter(a => a.id !== appId));
            }
        } catch (error) {
            console.error("Failed to accept", error);
            alert("처리 중 오류가 발생했습니다.");
        }
    };

    const handleRejectApplicant = async (appId: string) => {
        if (!crewId) return;
        if (window.confirm('가입 요청을 거절하시겠습니까?')) {
            try {
                await manageApplicant(crewId, parseInt(appId), 0);
                setApplicants(applicants.filter(a => a.id !== appId));
            } catch (error) {
                console.error("Failed to reject", error);
                alert("처리 중 오류가 발생했습니다.");
            }
        }
    };

    if (loading) {
        return <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">Loading...</div>;
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between relative bg-white dark:bg-zinc-950 z-10">
                <Button variant="ghost" onClick={onBack} className="-ml-2 text-zinc-900 dark:text-zinc-100">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className=" flex-1 text-center text-lg font-bold text-zinc-900">크루 멤버</h1>

                {/* Role Toggler for Demo */}
                {/* <button
                    onClick={() => setCurrentUserRole(prev => prev === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                    className="text-xs px-2 py-1 bg-zinc-100 rounded border border-zinc-200"
                >
                    {currentUserRole} View
                </button> */}
            </header>

            {/* Tabs (Admin Only) */}
            {
                currentUserRole === 'CREW_MANAGER' && (
                    <div className="px-6 flex gap-4 border-b border-zinc-100">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'members' ? 'text-zinc-900' : 'text-zinc-900/40'
                                }`}
                        >
                            전체 부원
                            {activeTab === 'members' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('applicants')}
                            className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'applicants' ? 'text-zinc-900' : 'text-zinc-900/40'
                                }`}
                        >
                            승인 대기
                            {applicants.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                                    {applicants.length}
                                </span>
                            )}
                            {activeTab === 'applicants' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full" />
                            )}
                        </button>
                    </div>
                )
            }

            <main className="flex-1 overflow-y-auto px-6 py-6 pb-28">

                {/* MEMBER LIST VIEW */}
                {(currentUserRole === 'CREW_MEMBER' || activeTab === 'members') && (
                    <div className="space-y-6">
                        {/* CAPTAIN badge section */}
                        <section>
                            <h3 className="text-sm font-bold text-zinc-400 mb-3">크루장</h3>
                            <div className="space-y-3">
                                {members.filter(m => m.role === 'CREW_CAPTAIN').map(member => (
                                    <div key={member.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                                                <UserIcon className="w-6 h-6 text-zinc-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-zinc-900">{member.name}</p>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold">CAPTAIN</span>
                                                </div>
                                                {currentUserRole === 'CREW_MANAGER' && (
                                                    <p className="text-xs text-zinc-500">{member.studentId}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Admin (Staff) Section */}
                        <section>
                            <h3 className="text-sm font-bold text-zinc-400 mb-3">운영진</h3>
                            <div className="space-y-3">
                                {members.filter(m => m.role === 'CREW_MANAGER').map(member => (
                                    <div key={member.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                                                <UserIcon className="w-6 h-6 text-zinc-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-zinc-900">{member.name}</p>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-bold">크루 매니저</span>
                                                </div>
                                                {currentUserRole === 'CREW_MANAGER' && (
                                                    <p className="text-xs text-zinc-500">{member.studentId}</p>
                                                )}
                                            </div>
                                        </div>
                                        {currentUserRole === 'CREW_MANAGER' && (
                                            <button
                                                onClick={() => handleDeleteMember(member.id, member.name)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash2Icon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* General Member Section */}
                        <section>
                            <h3 className="text-sm font-bold text-zinc-400 mb-3">부원 ({members.filter(m => m.role === 'CREW_MEMBER').length})</h3>
                            <div className="space-y-3">
                                {members.filter(m => m.role === 'CREW_MEMBER').map(member => (
                                    <div key={member.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                                                <UserIcon className="w-6 h-6 text-zinc-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-zinc-900">{member.name}</p>
                                                {currentUserRole === 'CREW_MANAGER' && (
                                                    <p className="text-xs text-zinc-500">{member.studentId}</p>
                                                )}
                                            </div>
                                        </div>
                                        {currentUserRole === 'CREW_MANAGER' && (
                                            <button
                                                onClick={() => handleDeleteMember(member.id, member.name)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash2Icon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {/* APPLICANT LIST VIEW (Admin Only) */}
                {currentUserRole === 'CREW_MANAGER' && activeTab === 'applicants' && (
                    <div className="space-y-6">
                        {applicants.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-zinc-500">총 {applicants.length}명의 신청이 있습니다.</span>
                                    <span className="text-xs font-semibold text-zinc-400">명단 대조 후 개별 승인</span>
                                </div>
                                <div className="space-y-3">
                                    {applicants.map(applicant => (
                                        <div key={applicant.id} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                                                        <UserIcon className="w-6 h-6 text-zinc-400" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-zinc-900">{applicant.name}</p>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                                                applicant.userType === 'KUSBF'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-zinc-100 text-zinc-600'
                                                            }`}>
                                                                {applicant.userType === 'KUSBF' ? '학생' : '일반'}
                                                            </span>
                                                        </div>
                                                        {applicant.userType === 'KUSBF' ? (
                                                            <p className="text-xs text-zinc-500">
                                                                {[applicant.schoolName || '학교 미등록', applicant.studentId || '학번 미등록'].join(' · ')}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-zinc-500">닉네임 프로필</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-zinc-400">{applicant.requestDate}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAcceptApplicant(applicant.id)}
                                                    className="flex-1 bg-zinc-900 text-white text-sm font-bold h-10 rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <CheckIcon className="w-4 h-4" />
                                                    수락
                                                </button>
                                                <button
                                                    onClick={() => handleRejectApplicant(applicant.id)}
                                                    className="flex-1 bg-zinc-100 text-zinc-600 text-sm font-bold h-10 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                    거절
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                <p>대기 중인 신청이 없습니다.</p>
                            </div>
                        )}
                    </div>
                )}

            </main>
        </div >
    );
}
