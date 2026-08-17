
import { useEffect, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { APP_VERSION, COPYRIGHT_TEXT } from '../version';
import kakaoLogin from '../assets/login/kakao.png';
import boardBuddyLogo from '../assets/boardbuddy-logo.png';
import apiClient from '../lib/axios';
import { getApiErrorMessage } from '../lib/apiError';
import {
    isAutoLoginEnabled,
    saveAuthTokens,
    saveTempAccessToken,
    setAutoLoginPreference,
    saveAccountId,
} from '../lib/session';
// import naver1 from '../assets/login/naver1.png';
// import naver2 from '../assets/login/naver2.png';
// import naverFrame from '../assets/login/naverframe.png';

interface LoginLandingProps {
    onLogin: () => void;
    onSignupNeeded: () => void;
    onProfileTypeNeeded: () => void;
    onDebugUserInfo?: () => void;
}

export default function LoginLanding({ onLogin, onSignupNeeded, onProfileTypeNeeded, /* onDebugUserInfo */ }: LoginLandingProps) {
    const [autoLogin, setAutoLogin] = useState(isAutoLoginEnabled());
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    useEffect(() => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
            const kakaoKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
            if (kakaoKey && kakaoKey !== 'YOUR_KAKAO_JAVASCRIPT_KEY') {
                window.Kakao.init(kakaoKey);
            } else {
                // Fallback or just log
                console.warn("Kakao Key not found in env. Please set VITE_KAKAO_JAVASCRIPT_KEY in .env");
                // Attempt init with placeholder if user hardcodes it here in dev
                // window.Kakao.init('YOUR_ACTUAL_KEY_IF_HARDCODED'); 
            }
        }
    }, []);

    const handleKakaoLogin = () => {
        if (isLoggingIn) return;
        if (!window.Kakao || !window.Kakao.isInitialized()) {
            alert('Kakao SDK not initialized. Please check your Kakao Key.');
            return;
        }

        setIsLoggingIn(true);
        window.Kakao.Auth.login({
            success: async (authObj) => {
                try {
                    const response = await apiClient.post('/auth/social/kakao', undefined, {
                        headers: {
                            'Authorization': `Bearer ${authObj.access_token}`,
                        },
                    });

                    const data = response.data;

                    if (response.status >= 200 && response.status < 300 && data.data) {
                        const { status, userType, accountId, accessToken, refreshToken } = data.data;

                        // Save the account ID
                        if (accountId) {
                            saveAccountId(accountId);
                        }

                        if (status === 'PENDING_PROFILE') {
                            // New User: Temporary token for signup
                            saveTempAccessToken(accessToken);
                            // Save auto-login preference
                            setAutoLoginPreference(autoLogin);
                            onSignupNeeded();
                        } else {
                            // Existing User: Login success
                            saveAuthTokens(accessToken, refreshToken);
                            // Save auto-login preference
                            setAutoLoginPreference(autoLogin);
                            if (userType === 'GENERAL') {
                                onProfileTypeNeeded();
                            } else {
                                onLogin();
                            }
                        }
                    } else {
                        setIsLoggingIn(false);
                        alert('로그인 응답을 확인할 수 없습니다. 다시 시도해주세요.');
                    }
                } catch (error: unknown) {
                    console.error('Network Error:', error);
                    setIsLoggingIn(false);
                    alert(getApiErrorMessage(error) || '로그인 처리 중 네트워크 오류가 발생했습니다.');
                }
            },
            fail: (err) => {
                console.error('Kakao Login Failed:', err);
                setIsLoggingIn(false);
                alert('카카오 로그인이 취소되었거나 실패했습니다.');
            },
        });
    };
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col relative overflow-hidden lg:bg-[#F5F4F0]">
            {/* Background Graphic */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1236px] h-[947px] pointer-events-none opacity-90 rotate-[42deg] scale-50 origin-center"
                style={{
                    zIndex: 0
                }}
            >
                <svg width="1236" height="947" viewBox="0 0 1236 947" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1170.71 608.242C1199.95 603.412 1227.94 622.208 1231.48 651.634C1238.97 713.874 1240.63 812.671 1180.99 836.069C926.72 935.818 336.633 947.014 54.9219 946.31C2.45238 946.179 -19.7784 881.079 21.2773 848.7L91.2393 793.524C98.6271 787.698 107.381 783.837 116.688 782.301L312.202 750.013C311.297 759.64 306.598 770.061 306.983 780.632C307.388 791.74 308.03 801.319 308.908 809.368C311.668 834.664 317.209 854.607 325.53 869.195C333.851 883.783 343.708 893.941 355.1 899.667C366.783 905.599 379.023 908 391.819 906.869C404.083 905.785 417.279 900.903 431.405 892.224C445.557 883.776 458.024 872.225 468.808 857.573C478.101 866.271 488.648 872.885 500.447 877.414C512.538 882.149 526.049 883.858 540.979 882.538C546.844 882.019 552.926 881.017 559.224 879.532C565.788 878.023 572.557 875.916 579.529 873.21C585.407 862.939 589.147 851.579 590.75 839.132C592.378 826.914 592.527 814.711 591.197 802.523C589.968 791.255 587.609 779.506 584.121 767.276C580.9 755.023 577.354 743.495 573.483 732.692C565.893 724.172 557.942 716.488 553.581 710.152L736.221 679.991C758.914 715.025 773.809 747.232 786.996 716.761C794.296 699.896 800.429 683.834 805.577 668.538L1170.71 608.242ZM424.386 783.487C427.789 792.473 431.433 801.206 435.319 809.685C439.497 818.371 444.146 826.435 449.265 833.877C442.251 838.676 434.833 842.235 427.011 844.552C419.214 847.098 411.182 848.737 402.918 849.468C391.188 850.505 379.973 850.103 369.274 848.262C358.868 846.628 350.315 844.714 343.615 842.52C342.931 841.188 342.134 838.82 341.225 835.418C340.582 831.992 339.939 828.566 339.296 825.14C338.92 821.691 338.631 819.046 338.431 817.206C337.854 811.917 337.785 806.351 338.224 800.508C338.688 794.894 339.539 789.13 340.778 783.216L424.386 783.487ZM558.071 783.858C559.856 787.88 561.349 791.695 562.55 795.303C564.043 799.118 564.952 802.521 565.278 805.51C561.132 811.914 554.689 817.012 545.951 820.802C537.238 824.823 528.883 827.187 520.885 827.894C508.621 828.978 495.614 825.716 481.863 818.109C468.113 810.502 456.627 798.979 447.406 783.542L558.071 783.858ZM1003.83 3.73999C1119.58 -32.7928 801.31 209.644 833.768 238.635C866.225 267.626 1075.24 158.574 1063.35 238.634C978.319 297.01 891.645 355.503 846.522 395.695C805.339 432.379 859.397 508.618 805.577 668.538L736.221 679.991C720.932 656.389 702.105 631.504 677.872 623.637C617.668 604.095 552.495 620.179 500.722 655.605C448.949 691.031 452.851 694.187 401.618 725.741C220.093 837.539 576.547 389.536 547.493 323.419C518.438 257.303 445.455 238.634 407.187 141.341C372.424 52.9591 585.991 213.574 631.108 196.936C676.224 180.298 594.262 133.002 1003.83 3.73999Z" fill="#FCCA59" />
                    <path d="M1170.71 608.242C1199.95 603.412 1227.94 622.208 1231.48 651.634C1238.97 713.874 1240.63 812.671 1180.99 836.069C926.72 935.818 336.633 947.014 54.9219 946.31C2.45238 946.179 -19.7784 881.079 21.2773 848.7L91.2393 793.524C98.6271 787.698 107.381 783.837 116.688 782.301L312.202 750.013C311.297 759.64 306.598 770.061 306.983 780.632C307.388 791.74 308.03 801.319 308.908 809.368C311.668 834.664 317.209 854.607 325.530 869.195C333.851 883.783 343.708 893.941 355.100 899.667C366.783 905.599 379.023 908 391.819 906.869C404.083 905.785 417.279 900.903 431.405 892.224C445.557 883.776 458.024 872.225 468.808 857.573C478.101 866.271 488.648 872.885 500.447 877.414C512.538 882.149 526.049 883.858 540.979 882.538C546.844 882.019 552.926 881.017 559.224 879.532C565.788 878.023 572.557 875.916 579.529 873.210C585.407 862.939 589.147 851.579 590.750 839.132C592.378 826.914 592.527 814.711 591.197 802.523C589.968 791.255 587.609 779.506 584.121 767.276C580.900 755.023 577.354 743.495 573.483 732.692C565.893 724.172 557.942 716.488 553.581 710.152L736.221 679.991C758.914 715.025 773.809 747.232 786.996 716.761C794.296 699.896 800.429 683.834 805.577 668.538L1170.71 608.242ZM424.386 783.487C427.789 792.473 431.433 801.206 435.319 809.685C439.497 818.371 444.146 826.435 449.265 833.877C442.251 838.676 434.833 842.235 427.011 844.552C419.214 847.098 411.182 848.737 402.918 849.468C391.188 850.505 379.973 850.103 369.274 848.262C358.868 846.628 350.315 844.714 343.615 842.520C342.931 841.188 342.134 838.820 341.225 835.418C340.582 831.992 339.939 828.566 339.296 825.140C338.920 821.691 338.631 819.046 338.431 817.206C337.854 811.917 337.785 806.351 338.224 800.508C338.688 794.894 339.539 789.130 340.778 783.216L424.386 783.487ZM558.071 783.858C559.856 787.880 561.349 791.695 562.550 795.303C564.043 799.118 564.952 802.521 565.278 805.510C561.132 811.914 554.689 817.012 545.951 820.802C537.238 824.823 528.883 827.187 520.885 827.894C508.621 828.978 495.614 825.716 481.863 818.109C468.113 810.502 456.627 798.979 447.406 783.542L558.071 783.858ZM1003.83 3.73999C1119.58 -32.7928 801.310 209.644 833.768 238.635C866.225 267.626 1075.24 158.574 1063.35 238.634C978.319 297.010 891.645 355.503 846.522 395.695C805.339 432.379 859.397 508.618 805.577 668.538L736.221 679.991C720.932 656.389 702.105 631.504 677.872 623.637C617.668 604.095 552.495 620.179 500.722 655.605C448.949 691.031 452.851 694.187 401.618 725.741C220.093 837.539 576.547 389.536 547.493 323.419C518.438 257.303 445.455 238.634 407.187 141.341C372.424 52.9591 585.991 213.574 631.108 196.936C676.224 180.298 594.262 133.002 1003.83 3.73999Z" fill="#FCCA59" />
                </svg>
            </div>

            {/* Content */}
            <div className="z-10 flex-1 flex flex-col items-center justify-between w-full max-w-md px-8 py-10 mx-auto lg:my-12 lg:flex-none lg:min-h-[calc(100vh-6rem)] lg:rounded-[2rem] lg:border lg:border-zinc-200 lg:bg-white lg:px-12 lg:shadow-xl">
                <div className="flex-1 flex items-center justify-center">
                    <img src={boardBuddyLogo} alt="BoardBuddy" className="h-20 w-72 object-cover object-center" />
                </div>

                <div className="w-full space-y-3 mt-auto mb-8">
                    {/* Debug Button */}
                    {/*
                    {onDebugUserInfo && (
                        <button
                            onClick={onDebugUserInfo}
                            className="w-full py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                        >
                            Debug: Info Input Page
                        </button>
                    )}
                    */}

                    <button
                        onClick={handleKakaoLogin}
                        disabled={isLoggingIn}
                        className="relative w-full hover:opacity-90 transition-opacity disabled:cursor-wait disabled:opacity-70"
                    >
                        <img src={kakaoLogin} alt="Kakao Login" className="w-full h-auto" />
                        {isLoggingIn && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#FEE500]/90 text-sm font-bold text-zinc-900">
                                로그인 처리 중...
                            </span>
                        )}
                    </button>
                    {isLoggingIn && (
                        <p className="text-center text-xs text-zinc-500">창을 새로고침하지 말고 잠시 기다려주세요.</p>
                    )}

                    {/* Auto-login checkbox */}
                    <div className="flex items-center justify-center pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${autoLogin ? 'bg-blue-600' : 'bg-zinc-300'}`}>
                                <CheckIcon className="w-3 h-3 text-white" />
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={autoLogin}
                                onChange={(e) => setAutoLogin(e.target.checked)}
                            />
                            <span className="text-zinc-800 text-sm dark:text-zinc-200">
                                자동 로그인
                            </span>
                        </label>
                    </div>

                    {/* Naver Login (Disabled)
                    <button
                        onClick={onLogin}
                        className="w-full hover:opacity-90 transition-opacity flex items-center justify-between px-4 h-12"
                        style={{
                            backgroundImage: `url(${naverFrame})`,
                            backgroundSize: '100% 100%',
                            backgroundRepeat: 'no-repeat'
                        }}
                    >
                        <img src={naver1} alt="Naver Logo" className="h-8 object-contain" />
                        <img src={naver2} alt="Naver Login" className="h-8 object-contain ml-auto" />
                    </button>
                    */}
                </div>

                {/* Version Info */}
                <div className="text-center pb-2">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{APP_VERSION}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{COPYRIGHT_TEXT}</p>
                </div>
            </div>
        </div>

    );
}
