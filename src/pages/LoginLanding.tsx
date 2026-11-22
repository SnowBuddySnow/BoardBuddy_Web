import { kakaoSignupScopes } from '../lib/kakaoScopes';
import { setSignupPrefill, type SignupPrefill } from '../lib/signupPrefill';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, UsersRound, Check } from 'lucide-react';
import { APP_VERSION, COPYRIGHT_TEXT } from '../version';
import kakaoLogin from '../assets/login/kakao.png';
import apiClient from '../lib/axios';
import { getApiErrorMessage } from '../lib/apiError';
import {
    beginOnboardingLogin,
    getCrewInvitationIntent,
    isCurrentOnboardingLogin,
} from '../lib/onboardingIntent';
import {
    buildNaverAuthorizeUrl,
    consumePendingNaverAuth,
    extractNaverCallbackFromUrl,
    getConfiguredNaverClientId,
    getNaverRedirectUri,
    isConfiguredNaverClientId,
    savePendingNaverAuth,
} from '../lib/naverOAuth';
import {
    isAutoLoginEnabled,
    saveAuthTokens,
    saveTempAccessToken,
    setAutoLoginPreference,
    saveAccountId,
} from '../lib/session';

interface SocialLoginPayload {
    status: string;
    userType: string;
    accountId: number;
    accessToken: string;
    refreshToken?: string;
    signupPrefill?: SignupPrefill;
}

interface LoginLandingProps {
    onLogin: (restoredOrganizerInviteToken?: string) => void;
    onSignupNeeded: () => void;
    onProfileTypeNeeded: () => void;
    onDebugUserInfo?: () => void;
    organizerInviteToken?: string;
    onNaverRedirect?: (url: string) => void;
}

export default function LoginLanding({
    onLogin,
    onSignupNeeded,
    onProfileTypeNeeded,
    organizerInviteToken,
    onNaverRedirect,
}: LoginLandingProps) {
    const [autoLogin, setAutoLogin] = useState(isAutoLoginEnabled());
    const [loggingInProvider, setLoggingInProvider] = useState<'kakao' | 'naver' | null>(null);
    const isLoggingIn = loggingInProvider !== null;
    const mountedRef = useRef(true);
    const callbacksRef = useRef({ onLogin, onSignupNeeded, onProfileTypeNeeded });
    callbacksRef.current = { onLogin, onSignupNeeded, onProfileTypeNeeded };

    const completeSocialLogin = (
        status: number,
        payload: SocialLoginPayload | undefined,
        autoLoginChoice: boolean,
        restoredOrganizerInviteToken?: string,
    ) => {
        if (status >= 200 && status < 300 && payload) {
            const { status: accountStatus, userType, accountId, accessToken, refreshToken } = payload;

            if (accountId) {
                saveAccountId(accountId);
            }

            if (accountStatus === 'PENDING_PROFILE') {
                saveTempAccessToken(accessToken);
                setAutoLoginPreference(autoLoginChoice);
                setSignupPrefill(accountId, payload.signupPrefill);
                callbacksRef.current.onSignupNeeded();
            } else {
                saveAuthTokens(accessToken, refreshToken);
                setAutoLoginPreference(autoLoginChoice);
                if (userType === 'GENERAL') {
                    callbacksRef.current.onProfileTypeNeeded();
                } else {
                    callbacksRef.current.onLogin(restoredOrganizerInviteToken);
                }
            }
        } else {
            if (mountedRef.current) setLoggingInProvider(null);
            alert('로그인 응답을 확인할 수 없습니다. 다시 시도해주세요.');
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
            const kakaoKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
            if (kakaoKey && kakaoKey !== 'YOUR_KAKAO_JAVASCRIPT_KEY') {
                window.Kakao.init(kakaoKey);
            } else {
                console.warn('Kakao Key not found in env. Please set VITE_KAKAO_JAVASCRIPT_KEY in .env');
            }
        }
    }, []);

    useEffect(() => {
        const callback = extractNaverCallbackFromUrl();
        if (!callback) return;

        const pending = consumePendingNaverAuth();
        if (!pending || !callback.state || pending.state !== callback.state) {
            alert('네이버 로그인 요청을 확인할 수 없습니다. 다시 시도해 주세요.');
            return;
        }

        if (callback.error || !callback.code) {
            alert('네이버 로그인이 취소되었거나 실패했습니다.');
            return;
        }

        const currentIntent = getCrewInvitationIntent();
        if (
            pending.invitationToken !== (currentIntent?.token || null)
            || pending.invitationEventId !== currentIntent?.eventId
        ) {
            alert('로그인 중 초대가 변경되었습니다. 현재 초대를 확인한 뒤 다시 로그인해 주세요.');
            return;
        }

        setLoggingInProvider('naver');
        setAutoLogin(pending.autoLogin);

        void (async () => {
            try {
                const response = await apiClient.post('/auth/social/naver/code', {
                    code: callback.code,
                    state: callback.state,
                });

                if (!mountedRef.current) return;

                const latestIntent = getCrewInvitationIntent();
                if (
                    pending.invitationToken !== (latestIntent?.token || null)
                    || pending.invitationEventId !== latestIntent?.eventId
                ) {
                    setLoggingInProvider(null);
                    alert('로그인 중 초대가 변경되었습니다. 현재 초대를 확인한 뒤 다시 로그인해 주세요.');
                    return;
                }

                completeSocialLogin(
                    response.status,
                    response.data?.data as SocialLoginPayload | undefined,
                    pending.autoLogin,
                    pending.organizerInviteToken,
                );
            } catch (error: unknown) {
                console.error('Naver Login Exchange Error:', error);
                if (mountedRef.current) setLoggingInProvider(null);
                alert(getApiErrorMessage(error) || '네이버 로그인 처리 중 오류가 발생했습니다.');
            }
        })();
    }, []);

    const handleKakaoLogin = () => {
        if (isLoggingIn) return;
        if (!window.Kakao || !window.Kakao.isInitialized()) {
            alert('Kakao SDK not initialized. Please check your Kakao Key.');
            return;
        }

        setLoggingInProvider('kakao');
        const continuation = beginOnboardingLogin();
        const scope = kakaoSignupScopes();
        try {
            window.Kakao.Auth.login({
                ...(scope ? { scope } : {}),
                success: async (authObj) => {
                    if (!isCurrentOnboardingLogin(continuation)) {
                        setLoggingInProvider(null);
                        alert('로그인 중 초대가 변경되었습니다. 현재 초대를 확인한 뒤 다시 로그인해 주세요.');
                        return;
                    }
                    try {
                        const response = await apiClient.post('/auth/social/kakao', undefined, {
                            headers: {
                                'Authorization': `Bearer ${authObj.access_token}`,
                            },
                        });

                        const data = response.data;

                        if (!isCurrentOnboardingLogin(continuation)) {
                            setLoggingInProvider(null);
                            alert('로그인 중 초대가 변경되었습니다. 현재 초대를 확인한 뒤 다시 로그인해 주세요.');
                            return;
                        }

                        completeSocialLogin(
                            response.status,
                            data?.data as SocialLoginPayload | undefined,
                            autoLogin,
                        );
                    } catch (error: unknown) {
                        console.error('Network Error:', error);
                        setLoggingInProvider(null);
                        alert(getApiErrorMessage(error) || '로그인 처리 중 네트워크 오류가 발생했습니다.');
                    }
                },
                fail: (err) => {
                    console.error('Kakao Login Failed:', err);
                    setLoggingInProvider(null);
                    alert('카카오 로그인이 취소되었거나 실패했습니다.');
                },
            });
        } catch (err: unknown) {
            console.error('Kakao Login Error:', err);
            setLoggingInProvider(null);
            alert('카카오 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        }
    };

    const handleNaverLogin = async () => {
        if (isLoggingIn) return;
        setLoggingInProvider('naver');

        try {
            let clientId = getConfiguredNaverClientId();
            if (!clientId) {
                const response = await apiClient.get('/auth/social/naver/config');
                const config = response.data?.data as { enabled?: boolean; clientId?: string | null } | undefined;
                if (config?.enabled && isConfiguredNaverClientId(config.clientId)) {
                    clientId = config.clientId.trim();
                }
            }

            if (!clientId) {
                if (mountedRef.current) setLoggingInProvider(null);
                alert('네이버 로그인이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.');
                return;
            }

            const state = crypto.randomUUID();
            const currentIntent = getCrewInvitationIntent();
            savePendingNaverAuth({
                state,
                autoLogin,
                createdAt: Date.now(),
                invitationToken: currentIntent?.token || null,
                invitationEventId: currentIntent?.eventId,
                organizerInviteToken: organizerInviteToken || undefined,
            });

            const authorizeUrl = buildNaverAuthorizeUrl(clientId, getNaverRedirectUri(), state);
            if (onNaverRedirect) {
                onNaverRedirect(authorizeUrl);
            } else {
                window.location.assign(authorizeUrl);
            }
        } catch (error: unknown) {
            console.error('Naver Login Start Error:', error);
            if (mountedRef.current) setLoggingInProvider(null);
            alert(getApiErrorMessage(error) || '네이버 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        }
    };

    return (
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#FAF8F3] text-[#162660]">
            <div className="mx-auto grid w-full max-w-6xl gap-7 px-4 py-6 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12 lg:py-12">
                <aside className="lg:pt-10">
                    <p className="text-sm font-black tracking-wide">BoardBuddy</p>
                    <h1 className="mt-4 text-3xl font-black leading-snug sm:text-4xl">함께할 크루,<br />여기서 시작해요.</h1>
                    <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-600">처음이라면 필요한 정보만 차례대로 확인해요. 이미 가입했다면 같은 카카오 또는 네이버 계정으로 이어갈 수 있어요.</p>
                    <ol aria-label="서비스 시작 단계" className="mt-6 flex flex-wrap gap-3 text-sm lg:flex-col lg:gap-5">
                        {['내 계정 확인', '내 크루 연결', '함께 활동 시작'].map((label, index) => <li key={label} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCCA59] text-xs font-black">{index + 1}</span>{label}</li>)}
                    </ol>
                </aside>
                <section className="min-w-0 rounded-3xl bg-white p-5 shadow-sm sm:p-8" aria-label="로그인과 회원가입">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCCA59]"><UsersRound className="h-7 w-7" /></span>
                    <h2 className="mt-5 text-2xl font-black">반가워요, 함께 시작할까요?</h2>
                    <p className="mt-3 text-sm leading-7 text-zinc-600">로그인과 회원가입을 한 번에 시작해요. 크루 초대 링크가 없어도 가입 후 내 동아리를 찾을 수 있어요.</p>
                    <div className="my-6 space-y-3 rounded-2xl bg-[#FAF8F3] p-4 text-sm leading-6">
                        <p className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0" />기존 회원은 로그인 후 바로 이용</p>
                        <p className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0" />처음이라면 내 정보와 본인 확인</p>
                    </div>
                    <div className="space-y-3">
                        <button type="button" onClick={handleKakaoLogin} disabled={isLoggingIn} className="relative block min-h-12 w-full overflow-hidden rounded-xl bg-[#FEE500] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70">
                            <img src={kakaoLogin} alt="Kakao Login" className="mx-auto block h-auto w-full max-w-sm" />
                            {loggingInProvider === 'kakao' && <span role="status" className="absolute inset-0 flex items-center justify-center bg-[#FEE500] text-sm font-bold text-zinc-900">로그인 처리 중...</span>}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleNaverLogin()}
                            disabled={isLoggingIn}
                            className="relative flex min-h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#03C75A] px-4 py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                        >
                            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current">
                                <path d="M13.56 10.7L6.16 0H0v20h6.44V9.3L13.84 20H20V0h-6.44z" />
                            </svg>
                            <span>네이버 로그인</span>
                            {loggingInProvider === 'naver' && <span role="status" className="absolute inset-0 flex items-center justify-center bg-[#03C75A] text-sm font-bold text-white">네이버 로그인 처리 중...</span>}
                        </button>
                    </div>
                    <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-center gap-3 text-sm"><input type="checkbox" checked={autoLogin} onChange={event => setAutoLogin(event.target.checked)} className="h-5 w-5 accent-[#162660]" />자동 로그인</label>
                    <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-zinc-600"><ShieldCheck className="mt-1 h-4 w-4 shrink-0" />가입만으로 크루 운영 권한이 생기지는 않아요. 크루 연결과 승인 상태를 차례대로 안내할게요.</p>
                    <footer className="mt-7 border-t border-zinc-100 pt-5 text-center text-[10px] leading-5 text-zinc-500"><p>{APP_VERSION}</p><p>{COPYRIGHT_TEXT}</p></footer>
                </section>
            </div>
        </main>
    );
}
