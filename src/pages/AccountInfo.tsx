import { useState, useEffect } from 'react';
import { ChevronLeftIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { getUserInfo, deleteAccount } from '../services/user';
import { UserDetail } from '../types/api';
import { APP_VERSION, COPYRIGHT_TEXT } from '../version';
import { clearAuthSession } from '../lib/session';

interface AccountInfoProps {
    onBack: () => void;
}

export default function AccountInfo({ onBack }: AccountInfoProps) {
    const [userInfo, setUserInfo] = useState<UserDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [phoneSharingConsent, setPhoneSharingConsent] = useState<'each_time' | 'always'>(() => {
        return (localStorage.getItem('phone_sharing_consent_preference') as 'each_time' | 'always') || 'each_time';
    });

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
            <div className="flex-1 overflow-hidden p-6 flex flex-col">
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
                                <div className="text-base font-medium">{userInfo.userType === 'KUSBF' ? '학생' : '일반'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">계정 코드</div>
                                <div className="flex items-center gap-2">
                                    <code className="text-base font-semibold">{userInfo.userCode}</code>
                                    <button
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(userInfo.userCode)}
                                        className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600"
                                    >
                                        복사
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-zinc-400">소모임 운영진 그룹 초대를 받을 때 이 코드를 공유하세요.</p>
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

                {/* Delete Account Button - Bottom */}
                <div className="mt-auto mb-8 flex justify-center">
                    <Button
                        variant="outline"
                        onClick={async () => {
                            if (confirm('정말 회원 탈퇴를 하시겠습니까?\n탈퇴 후 모든 데이터가 삭제되며 복구할 수 없습니다.')) {
                                try {
                                    await deleteAccount();
                                    // 성공 시 토큰 삭제 및 로그인 페이지로 리다이렉트
                                    clearAuthSession();
                                    alert('회원 탈퇴가 완료되었습니다.');
                                    window.location.href = '/';
                                } catch (error) {
                                    console.error('회원 탈퇴 실패:', error);
                                    alert('회원 탈퇴에 실패했습니다. 다시 시도해주세요.');
                                }
                            }
                        }}
                        className="w-32 h-10 text-sm border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                    >
                        회원 탈퇴
                    </Button>
                </div>

                {/* Version Info */}
                <div className="text-center mb-24">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{APP_VERSION}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{COPYRIGHT_TEXT}</p>
                </div>
            </div>
        </div>
    );
}
