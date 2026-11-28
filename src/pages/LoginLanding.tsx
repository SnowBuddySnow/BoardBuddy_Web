import { kakaoSignupScopes } from '../lib/kakaoScopes';
import { setSignupPrefill, type SignupPrefill } from '../lib/signupPrefill';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { m } from 'motion/react';
import BrandMark, { BrandWordmark } from '../components/BrandMark';
import { useHeroIntro } from '../hooks/useHeroIntro';
import { tapPress } from '../lib/motion';
import { APP_VERSION, COPYRIGHT_TEXT } from '../version';
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
import {
    clearNonMemberConversionIntent,
    getNonMemberConversionToken,
    getNonMemberCrewHint,
} from '../lib/nonMemberConversion';

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
    const [hasNonMemberConversion, setHasNonMemberConversion] = useState(() => Boolean(getNonMemberConversionToken()));
    const nonMemberCrewHint = getNonMemberCrewHint();
    const isLoggingIn = loggingInProvider !== null;
    const mountedRef = useRef(true);
    const heroRef = useRef<HTMLDivElement>(null);
    useHeroIntro(heroRef);
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
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-brand-cream text-brand-navy">
            <div ref={heroRef} className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 sm:px-8 sm:py-10 lg:min-h-full lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center lg:gap-16 lg:py-12">
                <aside className="min-w-0">
                    <div data-hero-item className="flex items-center gap-2.5">
                        <BrandMark size={40} />
                        <BrandWordmark />
                    </div>
                    <h1 data-hero-item className="mt-6 text-[1.75rem] font-black leading-tight tracking-tight sm:text-4xl lg:mt-10 lg:text-[2.75rem]">함께할 크루,<br />여기서 시작해요.</h1>
                    <p data-hero-item className="mt-3 max-w-sm text-sm leading-6 text-zinc-600 sm:text-[15px] sm:leading-7">처음이라면 필요한 정보만 차례대로 확인해요. 이미 가입했다면 같은 계정으로 이어갈 수 있어요.</p>
                    <ol aria-label="서비스 시작 단계" className="mt-5 flex flex-wrap gap-2 text-[13px] font-bold lg:mt-8 lg:flex-col lg:gap-3 lg:text-sm">
                        {['내 계정 확인', '내 크루 연결', '함께 활동 시작'].map((label, index) => <li data-hero-item key={label} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 shadow-[0_1px_0_rgba(22,38,96,0.06)] lg:bg-transparent lg:p-0 lg:shadow-none"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-sun text-[11px] font-black lg:h-8 lg:w-8 lg:text-xs">{index + 1}</span>{label}</li>)}
                    </ol>
                </aside>
                <section data-hero-card className="min-w-0 rounded-3xl bg-white p-5 shadow-[0_12px_40px_-16px_rgba(22,38,96,0.18)] sm:p-7" aria-label="로그인과 회원가입">
                    <h2 className="text-xl font-black sm:text-2xl">반가워요, 함께 시작할까요?</h2>
                    <p className="mb-5 mt-2 text-sm leading-6 text-zinc-600">로그인과 회원가입을 한 번에 시작해요. 초대 링크가 없어도 가입 후 내 동아리를 찾을 수 있어요.</p>
                    {hasNonMemberConversion && (
                        <div className="mb-5 rounded-2xl border border-[#FCCA59] bg-[#FFFBEB] p-4 text-left">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-xs font-black text-[#162660]">비회원 신청 정보로 학생 계정 이어서 가입</p>
                                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                                        카카오 또는 네이버를 연결하면 방금 인증한 휴대전화번호와 소속 학교{nonMemberCrewHint ? `(${nonMemberCrewHint})` : ''}가 자동으로 채워지고, 신청한 이벤트가 내 계정에 자동 연결돼요.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearNonMemberConversionIntent();
                                        setHasNonMemberConversion(false);
                                    }}
                                    className="shrink-0 text-xs font-bold text-zinc-500 underline"
                                >
                                    연동 취소
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-3">
                        {/* Both providers share one layout: symbol pinned 16px from the left edge, label centred
                            across the full width, so the two symbols always sit in the same column. */}
                        <m.button type="button" onClick={handleKakaoLogin} disabled={isLoggingIn} whileTap={isLoggingIn ? undefined : tapPress} className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-[#FEE500] px-12 text-[15px] font-bold text-black/85 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70">
                            <span aria-hidden="true" className="absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
                                <svg viewBox="0 0 20 20" className="h-5 w-5 fill-black">
                                    <path d="M10 2.2C5.03 2.2 1 5.33 1 9.19c0 2.5 1.67 4.69 4.19 5.93l-.88 3.22c-.08.29.25.52.5.35l3.85-2.55c.44.05.89.07 1.34.07 4.97 0 9-3.13 9-6.99S14.97 2.2 10 2.2z" />
                                </svg>
                            </span>
                            <span>카카오 로그인</span>
                            {loggingInProvider === 'kakao' && <span role="status" className="absolute inset-0 flex items-center justify-center bg-[#FEE500] text-sm font-bold text-zinc-900">로그인 처리 중...</span>}
                        </m.button>
                        <m.button
                            type="button"
                            onClick={() => void handleNaverLogin()}
                            disabled={isLoggingIn}
                            whileTap={isLoggingIn ? undefined : tapPress}
                            className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-[#03C75A] px-12 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                        >
                            <span aria-hidden="true" className="absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
                                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                                    <path d="M13.56 10.7L6.16 0H0v20h6.44V9.3L13.84 20H20V0h-6.44z" />
                                </svg>
                            </span>
                            <span>네이버 로그인</span>
                            {loggingInProvider === 'naver' && <span role="status" className="absolute inset-0 flex items-center justify-center bg-[#03C75A] text-sm font-bold text-white">네이버 로그인 처리 중...</span>}
                        </m.button>
                    </div>
                    <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2.5 text-sm font-semibold text-zinc-700"><input type="checkbox" checked={autoLogin} onChange={event => setAutoLogin(event.target.checked)} className="h-5 w-5 accent-brand-navy" />자동 로그인</label>
                    <p className="mt-3 flex items-start gap-2 rounded-2xl bg-brand-cream px-3 py-2.5 text-xs leading-5 text-zinc-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" />가입만으로 크루 운영 권한이 생기지는 않아요. 크루 연결과 승인 상태를 차례대로 안내할게요.</p>
                    <footer className="mt-5 border-t border-zinc-100 pt-4 text-center text-[10px] leading-5 text-zinc-400"><p>{APP_VERSION}</p><p>{COPYRIGHT_TEXT}</p></footer>
                </section>
            </div>
        </main>
    );
}
