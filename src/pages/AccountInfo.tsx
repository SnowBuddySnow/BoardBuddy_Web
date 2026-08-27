import { useState, useEffect } from 'react';
import { ChevronLeftIcon, Download, LogOut, Trash2, UserMinus } from 'lucide-react';
import { Button } from '../components/Button';
import { getUserInfo, deleteAccount, downloadPersonalData } from '../services/user';
import { leaveCrew } from '../services/crew';
import { UserDetail } from '../types/api';
import { APP_VERSION, COPYRIGHT_TEXT } from '../version';
import { clearAuthSession } from '../lib/session';
import { isCrewCaptainRole } from '../constants/crewRole';

interface AccountInfoProps {
    onBack: () => void;
    onStudentVerificationClick?: () => void;
}

export default function AccountInfo({ onBack, onStudentVerificationClick }: AccountInfoProps) {
    const [userInfo, setUserInfo] = useState<UserDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [phoneSharingConsent, setPhoneSharingConsent] = useState<'each_time' | 'always'>(() => {
        return (localStorage.getItem('phone_sharing_consent_preference') as 'each_time' | 'always') || 'each_time';
    });
    const [actionBusy, setActionBusy] = useState<'download' | 'leave' | 'delete' | null>(null);
    const [actionError, setActionError] = useState('');

    const handleDownload = async () => {
        setActionBusy('download');
        setActionError('');
        try {
            await downloadPersonalData();
        } catch (error) {
            console.error('Personal data export failed:', error);
            setActionError('개인정보 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setActionBusy(null);
        }
    };

    const handleLeaveCrew = async () => {
        if (!userInfo?.crew || isCrewCaptainRole(userInfo.role)) return;
        if (!confirm(`${userInfo.crew.crewName} 크루에서 탈퇴하시겠습니까?\n기존 예약과 이벤트 참가는 자동 취소되지 않습니다.`)) return;
        setActionBusy('leave');
        setActionError('');
        try {
            await leaveCrew(userInfo.crew.crewId);
            setUserInfo(current => current ? { ...current, crew: null, role: 'MEMBER' } : current);
            alert('크루 탈퇴가 완료되었습니다.');
        } catch (error) {
            console.error('Crew departure failed:', error);
            setActionError('크루에서 탈퇴하지 못했습니다. 크루장이라면 먼저 크루장 권한을 이전해야 합니다.');
        } finally {
            setActionBusy(null);
        }
    };

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const data = await getUserInfo();
                setUserInfo(data);
            } catch (error) {
                console.error('Failed to fetch user info:', error);
                alert('사용자 정보를 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserInfo();
    }, []);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-zinc-500">로딩 중...</div>
            </div>
        );
    }

    if (!userInfo) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-zinc-500">사용자 정보를 불러올 수 없습니다.</div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <header className="px-4 pt-2 pb-2 flex items-center justify-between relative">
                <Button variant="ghost" onClick={onBack} className="-ml-2 text-zinc-900 dark:text-zinc-100">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold absolute left-1/2 -translate-x-1/2" style={{ fontFamily: '"Joti One", serif' }}>My Page</h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                {/* Title */}
                <div className="mb-4">
                    <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">계정 관리</h2>
                </div>

                {/* User Info Section */}
                <div className="space-y-4 mb-8">
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">프로필 유형</div>
                                <div className="text-base font-medium">
                                    {userInfo.userType === 'KUSBF' ? '학생' : userInfo.userType === 'REGULAR' ? '일반' : '확인 필요'}
                                </div>
                            </div>
                            {userInfo.userType === 'KUSBF' && (
                                <>
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">학교</div>
                                        <div className="text-base font-medium">{userInfo.school || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">학번</div>
                                        <div className="text-base font-medium">{userInfo.studentId || '등록하지 않음'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-1">학생 인증</div>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-base font-medium">
                                                {userInfo.universityVerificationStatus === 'VERIFIED'
                                                    ? '인증 완료'
                                                    : userInfo.universityVerificationStatus === 'PENDING'
                                                        ? '이메일 확인 대기 중'
                                                        : '미인증'}
                                            </div>
                                            {userInfo.universityVerificationStatus !== 'VERIFIED' && onStudentVerificationClick && (
                                                <button
                                                    type="button"
                                                    onClick={onStudentVerificationClick}
                                                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-[#162660]"
                                                >
                                                    이메일 인증
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">생년월일</div>
                                <div className="text-base font-medium">{userInfo.birthDate}</div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">전화번호</div>
                                <div className="text-base font-medium">{userInfo.phoneNumber}</div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 mb-1.5">전화번호 제공 동의 설정</div>
                                <div className="flex gap-4 bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 w-fit">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="accountPhoneConsent"
                                            value="each_time"
                                            checked={phoneSharingConsent === 'each_time'}
                                            onChange={() => {
                                                setPhoneSharingConsent('each_time');
                                                localStorage.setItem('phone_sharing_consent_preference', 'each_time');
                                            }}
                                            className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">제공 시 매번 동의</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="accountPhoneConsent"
                                            value="always"
                                            checked={phoneSharingConsent === 'always'}
                                            onChange={() => {
                                                setPhoneSharingConsent('always');
                                                localStorage.setItem('phone_sharing_consent_preference', 'always');
                                            }}
                                            className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">항상 동의</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">성별</div>
                                <div className="text-base font-medium">
                                    {userInfo.gender === 'MALE' ? '남성' : userInfo.gender === 'FEMALE' ? '여성' : userInfo.gender}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">회원가입 날짜</div>
                                <div className="text-base font-medium">
                                    {userInfo.createdAt ? new Date(userInfo.createdAt).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {userInfo.crew && (
                        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                            <div className="text-xs text-zinc-500 mb-1">소속 크루</div>
                            <div className="text-base font-medium">{userInfo.crew.crewName}</div>
                        </div>
                    )}
                </div>

                <section className="mt-auto mb-8 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div>
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white">내 데이터와 계정</h3>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">저장된 개인정보를 내려받거나 서비스·크루 이용을 종료할 수 있습니다.</p>
                    </div>

                    <button type="button" onClick={() => void handleDownload()} disabled={actionBusy !== null} className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        <Download className="h-4 w-4" />
                        <span className="min-w-0 flex-1">내 개인정보 JSON으로 받기</span>
                        <span className="text-xs font-medium text-zinc-400">{actionBusy === 'download' ? '준비 중' : '다운로드'}</span>
                    </button>

                    {userInfo.crew && (
                        <button type="button" onClick={() => void handleLeaveCrew()} disabled={actionBusy !== null || isCrewCaptainRole(userInfo.role)} className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-left text-sm font-bold text-amber-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800">
                            <UserMinus className="h-4 w-4" />
                            <span className="min-w-0 flex-1">
                                <span className="block">{userInfo.crew.crewName}에서 탈퇴</span>
                                {isCrewCaptainRole(userInfo.role) && <span className="mt-0.5 block text-[10px] font-medium">크루장은 권한 이전 후 탈퇴할 수 있습니다.</span>}
                            </span>
                        </button>
                    )}

                    <button type="button" onClick={() => {
                        if (!confirm('BoardBuddy에서 로그아웃하시겠습니까?')) return;
                        clearAuthSession();
                        window.location.href = '/';
                    }} disabled={actionBusy !== null} className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        <LogOut className="h-4 w-4" /> BoardBuddy 로그아웃
                    </button>

                    <button
                        type="button"
                        disabled={actionBusy !== null}
                        onClick={async () => {
                            if (!confirm('정말 회원 탈퇴를 하시겠습니까?\n탈퇴 처리 후 계정으로 다시 로그인할 수 없습니다. 먼저 개인정보를 내려받는 것을 권장합니다.')) return;
                            setActionBusy('delete');
                            setActionError('');
                            try {
                                await deleteAccount();
                                clearAuthSession();
                                alert('회원 탈퇴가 완료되었습니다.');
                                window.location.href = '/';
                            } catch (error) {
                                console.error('회원 탈퇴 실패:', error);
                                setActionError('회원 탈퇴에 실패했습니다. 다시 시도해 주세요.');
                                setActionBusy(null);
                            }
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-left text-sm font-bold text-red-600 disabled:opacity-40 dark:bg-zinc-800"
                    >
                        <Trash2 className="h-4 w-4" /> 회원 탈퇴
                    </button>

                    {actionError && <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">{actionError}</p>}
                </section>

                {/* Version Info */}
                <div className="text-center mb-24">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{APP_VERSION}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{COPYRIGHT_TEXT}</p>
                </div>
            </div>
        </div>
    );
}
