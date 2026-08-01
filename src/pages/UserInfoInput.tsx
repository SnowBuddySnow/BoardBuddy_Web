import { Button } from '../components/Button';
import { ChevronLeftIcon, CheckIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TermsModal } from '../components/TermsModal';
import apiClient from '../lib/axios';
import {
    clearTempAccessToken,
    getAccountId,
    getSignupToken,
    saveAccountId,
    saveAuthTokens,
    saveTempAccessToken,
} from '../lib/session';
import { confirmPhoneVerification, requestPhoneVerification } from '../services/phoneVerification';
import { getSchools, type SchoolOption } from '../services/schools';
import type { SignupUserType } from './UserTypeSelection';

interface UserInfoInputProps {
    userType: SignupUserType;
    onBack: () => void;
    onSuccess?: () => void;
}

const SCHOOL_ALIASES: Record<string, string[]> = {
    '홍익대학교': ['홍대', 'hongik university', 'hongik'],
    '충남대학교': ['충남대', '충대', 'chungnam national university', 'chungnam', 'cnu'],
    '카이스트': ['한국과학기술원', 'kaist'],
    '세종대학교': ['세종대', 'sejong university', 'sejong'],
    '이화여자대학교': ['이대', 'ewha womans university', 'ewha'],
    '숙명여자대학교': ['숙대', 'sookmyung womens university', 'sookmyung'],
};

// DEV PHONE BYPASS: Vite removes this path from production builds because import.meta.env.DEV is false.
// Delete this constant, the skip handler, and the development-only button to restore verification-only UI.
const CAN_SKIP_PHONE_VERIFICATION = import.meta.env.DEV;

const TERMS_CONTENT = {
    service: {
        title: '보드버디 서비스 이용약관',
        content: `제1조 (목적)
본 약관은 '보드버디(BoardBuddy)'(이하 "서비스")가 제공하는 서비스의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다. 본 서비스는 시즌방 운영진의 효율적인 관리와 이용자들의 편리한 예약 및 정보 확인을 돕기 위해 제공됩니다.

제2조 (서비스의 제공 및 제한)
1. 본 서비스는 소규모 그룹 프로젝트로 진행 중이며, 운영 환경에 따라 일부 기능의 오작동 및 예상치 못한 버그가 발생할 수 있습니다.
2. 개발팀은 버그 및 시스템 오류가 발생할 경우 신속히 조치하기 위해 노력할 것이나, 예외적인 조치 시간이 소요될 수 있습니다.
3. 이용자는 소규모 프로젝트의 특성상 오류가 발생할 수 있음을 인지하고 동의합니다.`
    },
    privacy: {
        title: '개인정보 수집 및 이용 동의',
        content: `'보드버디'는 이용자의 프라이버시 및 개인정보를 매우 소중하게 생각하며, 이를 안전하게 보존합니다. 수집된 정보는 본인 확인 및 서비스 제공 목적 외에 제3자에게 무단 제공되지 않습니다.

1. 개인정보 수집 및 이용 목적
- 서비스 제공 (본인 확인, 회원 식별 및 회원 관리)
- 시즌방 예약 및 모임 이용 현황 관리
- 서비스 오류 발생 시 공지 및 대응

2. 개인정보 수집 항목
- 성명 또는 닉네임, 성별, 휴대전화번호, 이메일(선택)
- KUSBF 회원의 경우 학교, 학번

3. 개인정보 제3자 제공 동의 (휴대전화번호 제공)
- 시즌방 예약 확인, 공지사항 전달, 비상 연락 및 이용자 안전 등 원활한 모임 운영 및 서비스 제공을 위해, 귀하가 속한 시즌방 운영진 및 모임 관리자(manager users)에게 귀하의 휴대전화번호가 제공될 수 있습니다.
- 귀하는 제공 시마다 매번 확인 동의를 하거나, 매번 묻지 않도록 '항상 동의' 설정을 선택할 수 있습니다. 동의 여부는 마이페이지 계정 관리에서 언제든지 변경 가능합니다.

4. 보유 및 이용 기간
- 회원 탈퇴 시 혹은 서비스 종료 시까지 즉시 파기
(단, 관계 법령에 의하여 보존할 필요가 있는 경우 해당 기간 보존)

5. 동의 거부 권리
- 귀하는 개인정보 수집 및 이용에 동의를 거부할 권리가 있습니다. 필수 동의 사항을 거부하실 경우 서비스 이용이 제한됩니다.`
    }
};


export default function UserInfoInput({ userType, onBack, onSuccess }: UserInfoInputProps) {
    const [name, setName] = useState('');
    const [school, setSchool] = useState('');
    const [studentId, setStudentId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneChallengeId, setPhoneChallengeId] = useState<string | null>(null);
    const [phoneCode, setPhoneCode] = useState('');
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [phoneVerificationSkipped, setPhoneVerificationSkipped] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [isVerifyingCode, setIsVerifyingCode] = useState(false);
    const [email, setEmail] = useState('');
    const [gender, setGender] = useState<'female' | 'male' | null>(null);
    const [terms, setTerms] = useState({
        term1: false,
        term2: false,
    });
    const [phoneConsentPreference, setPhoneConsentPreference] = useState<'each_time' | 'always'>('each_time');
    const [activeModal, setActiveModal] = useState<'service' | 'privacy' | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // School Search State
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [filteredSchools, setFilteredSchools] = useState<SchoolOption[]>([]);
    const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
    const schoolInputRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (schoolInputRef.current && !schoolInputRef.current.contains(event.target as Node)) {
                setShowSchoolDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getSchools()
            .then((data) => {
                if (!cancelled) setSchools(data);
            })
            .catch(() => {
                if (!cancelled) alert('학교 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
            });
        return () => { cancelled = true; };
    }, []);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');

        let formattedValue = '';
        if (value.length <= 3) {
            formattedValue = value;
        } else if (value.length <= 7) {
            formattedValue = `${value.slice(0, 3)}-${value.slice(3)}`;
        } else {
            formattedValue = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
        }

        // Maximum length check (13 characters including dashes: 010-0000-0000)
        if (formattedValue.length > 13) return;

        setPhoneNumber(formattedValue);
        setPhoneChallengeId(null);
        setPhoneCode('');
        setPhoneVerified(false);
        setPhoneVerificationSkipped(false);
    };

    const handleSendPhoneCode = async () => {
        if (!/^010-\d{4}-\d{4}$/.test(phoneNumber)) {
            alert('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
            return;
        }
        setIsSendingCode(true);
        try {
            const challenge = await requestPhoneVerification(phoneNumber);
            setPhoneChallengeId(challenge.challengeId);
            setPhoneCode('');
            setPhoneVerified(false);
            setPhoneVerificationSkipped(false);
            alert('인증번호를 전송했습니다.');
        } catch (error) {
            console.error('Phone verification request failed:', error);
            alert('인증번호 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleConfirmPhoneCode = async () => {
        if (!phoneChallengeId || !/^\d{6}$/.test(phoneCode)) {
            alert('6자리 인증번호를 입력해주세요.');
            return;
        }
        setIsVerifyingCode(true);
        try {
            const result = await confirmPhoneVerification(phoneChallengeId, phoneCode);
            saveAccountId(result.accountId);
            saveTempAccessToken(result.accessToken);
            setPhoneVerified(true);
            setPhoneVerificationSkipped(false);

            if (result.resolution === 'LINKED_EXISTING_ACCOUNT' && result.status === 'ACTIVE') {
                saveAuthTokens(result.accessToken, result.refreshToken);
                clearTempAccessToken();
                alert('기존 계정을 확인했습니다. 새 로그인 수단이 기존 계정에 연결되었습니다.');
                onSuccess?.();
                return;
            }
            if (result.resolution === 'LINKED_EXISTING_ACCOUNT') {
                alert('기존 가입 정보를 확인했습니다. 이 계정으로 가입을 계속합니다.');
            } else {
                alert('전화번호 인증이 완료되었습니다.');
            }
        } catch (error) {
            console.error('Phone verification confirmation failed:', error);
            alert('인증번호가 올바르지 않거나 만료되었습니다.');
        } finally {
            setIsVerifyingCode(false);
        }
    };

    // Development-only escape hatch. The backend has a matching non-production policy switch.
    const handleSkipPhoneVerification = () => {
        if (!/^010-\d{4}-\d{4}$/.test(phoneNumber)) {
            alert('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
            return;
        }
        setPhoneChallengeId(null);
        setPhoneCode('');
        setPhoneVerified(true);
        setPhoneVerificationSkipped(true);
    };

    const handleSchoolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSchool(value);

        if (value.trim() === '') {
            setFilteredSchools([]);
            setShowSchoolDropdown(false);
            return;
        }

        const lowerValue = value.toLowerCase();
        const filtered = schools.filter(item =>
            item.name.toLowerCase().includes(lowerValue) ||
            (SCHOOL_ALIASES[item.name] || []).some(alias => alias.includes(lowerValue))
        );

        setFilteredSchools(filtered);
        setShowSchoolDropdown(filtered.length > 0);
    };

    const handleSchoolSelect = (schoolName: string) => {
        setSchool(schoolName);
        setFilteredSchools([]);
        setShowSchoolDropdown(false);
    };

    const handleSubmit = async () => {
        // Granular Validation
        if (!name.trim()) { alert(userType === 'KUSBF' ? '이름을 입력해주세요.' : '닉네임을 입력해주세요.'); return; }
        if (userType === 'KUSBF' && !school) { alert('KUSBF 회원은 학교를 입력해주세요.'); return; }
        if (userType === 'KUSBF' && !studentId) { alert('KUSBF 회원은 학번을 입력해주세요.'); return; }
        if (!phoneNumber) { alert('전화번호를 입력해주세요.'); return; }
        if (!phoneVerified) { alert('전화번호 인증을 완료해주세요.'); return; }
        if (!gender) { alert('성별을 선택해주세요.'); return; }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) { alert('이메일 형식이 올바르지 않습니다.'); return; }

        if (!terms.term1) { alert('첫 번째 필수 약관에 동의해주세요.'); return; }
        if (!terms.term2) { alert('두 번째 필수 약관에 동의해주세요.'); return; }

        // Phone number format validation (010-XXXX-XXXX)
        const phoneRegex = /^010-\d{4}-\d{4}$/;
        if (!phoneRegex.test(phoneNumber)) {
            alert('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
            return;
        }

        const selectedSchool = schools.find((item) => item.name === school);
        if (userType === 'KUSBF' && !selectedSchool) {
            alert('검색 결과에서 학교를 선택해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            const token = getSignupToken();
            const accountId = getAccountId();

            if (!token || !accountId) {
                alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
                onBack();
                return;
            }

            const schoolId = selectedSchool?.id;

            const response = await apiClient.put(`/accounts/${accountId}/profile`, {
                userType,
                displayName: name.trim(),
                email: email.trim() || undefined,
                schoolId: userType === 'KUSBF' ? schoolId : undefined,
                studentNumber: userType === 'KUSBF' ? studentId.trim() : undefined,
                gender: gender === 'male' ? 'MALE' : 'FEMALE',
                phoneNumber
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });

            if (response.status >= 200 && response.status < 300) {
                alert('회원가입이 완료되었습니다.');
                
                // Save phone number sharing consent preference
                localStorage.setItem('phone_sharing_consent_preference', phoneConsentPreference);

                // Promote temp token to final token
                const completedProfile = response.data.data as { accessToken: string; refreshToken: string };
                if (completedProfile.accessToken) {
                    saveAuthTokens(completedProfile.accessToken, completedProfile.refreshToken);
                    clearTempAccessToken();
                }

                if (onSuccess) {
                    onSuccess();
                } else {
                    onBack();
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('서버 연결 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950 relative">

            {/* Scrollable Content Wrapper */}
            <div className="flex-1 overflow-y-auto pb-24">
                {/* Top Section - Light Blue */}
                <div className="bg-[#D6E6F5] px-6 pt-4 pb-10 flex flex-col">
                    {/* Header */}
                    <header className="flex items-center justify-between relative mb-8">
                        <Button variant="ghost" onClick={onBack} className="-ml-2 text-zinc-900">
                            <ChevronLeftIcon className="w-6 h-6" />
                        </Button>
                        <h1 className="text-lg font-bold text-zinc-900 absolute left-1/2 -translate-x-1/2">회원 정보</h1>
                        <div className="w-10" />
                    </header>

                    {/* Form Fields */}
                    <div className="space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-800 ml-1">{userType === 'KUSBF' ? '이름' : '닉네임'}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                                placeholder={userType === 'KUSBF' ? '홍길동' : '보드버디'}
                            />
                            {userType === 'KUSBF' && <p className="text-xs text-zinc-600 ml-1">KUSBF 회원 확인에 사용할 이름을 입력해주세요.</p>}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-800 ml-1">
                                {userType === 'KUSBF' ? '학교 이메일 인증' : '이메일'} <span className="font-normal text-zinc-500">(선택)</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                                placeholder={userType === 'KUSBF' ? 'student@university.ac.kr' : 'name@example.com'}
                            />
                            {userType === 'KUSBF' && <p className="text-xs text-zinc-600 ml-1">학교별 인증 도메인이 등록되면 이 주소로 인증을 진행합니다.</p>}
                        </div>

                        {userType === 'KUSBF' && <>
                        {/* School (Dropdown) */}
                        <div className="space-y-2 relative" ref={schoolInputRef}>
                            <label className="text-sm font-bold text-zinc-800 ml-1">학교 *</label>
                            <input
                                type="text"
                                value={school}
                                onChange={handleSchoolChange}
                                onFocus={() => {
                                    if (school && filteredSchools.length > 0) {
                                        setShowSchoolDropdown(true);
                                    }
                                }}
                                className="w-full h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                                placeholder="학교명을 검색하세요 (예: 홍익대학교, 홍대)"
                            />
                            {showSchoolDropdown && (
                                <div className="absolute top-[80px] left-0 right-0 bg-white rounded-xl shadow-lg border border-zinc-100 max-h-48 overflow-y-auto z-50">
                                    {filteredSchools.map((item, index) => (
                                        <button
                                            key={index}
                                            className="w-full text-left px-4 py-3 hover:bg-zinc-50 text-zinc-900 text-sm border-b border-zinc-50 last:border-none"
                                            onClick={() => handleSchoolSelect(item.name)}
                                        >
                                            <span className="font-bold">{item.name}</span>
                                            {(SCHOOL_ALIASES[item.name] || []).length > 0 && (
                                                <span className="text-zinc-400 text-xs ml-2">({SCHOOL_ALIASES[item.name][0]})</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Student ID */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-800 ml-1">학번 *</label>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                className="w-full h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                                placeholder="20230001"
                            />
                        </div>

                        </>}

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-800 ml-1">전화번호</label>
                            <div className="flex gap-2">
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={handlePhoneChange}
                                    disabled={phoneVerified}
                                    maxLength={13}
                                    className="min-w-0 flex-1 h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white disabled:bg-zinc-100"
                                    placeholder="010-0000-0000"
                                />
                                <button
                                    type="button"
                                    onClick={handleSendPhoneCode}
                                    disabled={isSendingCode || phoneVerified}
                                    className="shrink-0 rounded-[16px] bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-zinc-400"
                                >
                                    {phoneVerificationSkipped ? '개발용 건너뜀' : phoneVerified ? '인증완료' : isSendingCode ? '전송중' : phoneChallengeId ? '재전송' : '인증요청'}
                                </button>
                            </div>
                            {phoneChallengeId && !phoneVerified && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={phoneCode}
                                        onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6}
                                        className="min-w-0 flex-1 h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                                        placeholder="6자리 인증번호"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleConfirmPhoneCode}
                                        disabled={isVerifyingCode || phoneCode.length !== 6}
                                        className="shrink-0 rounded-[16px] bg-zinc-900 px-4 text-sm font-semibold text-white disabled:bg-zinc-400"
                                    >
                                        {isVerifyingCode ? '확인중' : '확인'}
                                    </button>
                                </div>
                            )}
                            {CAN_SKIP_PHONE_VERIFICATION && !phoneVerified && (
                                <button
                                    type="button"
                                    onClick={handleSkipPhoneVerification}
                                    className="w-full rounded-[14px] border border-dashed border-amber-500 bg-amber-50 py-2.5 text-xs font-semibold text-amber-800"
                                >
                                    개발용: 전화번호 인증 건너뛰기
                                </button>
                            )}
                        </div>

                        {/* Gender */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-800 ml-1">성별</label>
                            <div className="flex items-center gap-8 mt-2 ml-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${gender === 'female' ? 'bg-blue-500 border-blue-500' : 'bg-zinc-300 border-zinc-300'}`}>
                                        {gender === 'female' && <CheckIcon className="w-4 h-4 text-white" />}
                                    </div>
                                    <input
                                        type="radio"
                                        name="gender"
                                        className="hidden"
                                        onChange={() => setGender('female')}
                                        checked={gender === 'female'}
                                    />
                                    <span className="text-zinc-800 font-medium">여자</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${gender === 'male' ? 'bg-blue-500 border-blue-500' : 'bg-zinc-300 border-zinc-300'}`}>
                                        {gender === 'male' && <CheckIcon className="w-4 h-4 text-white" />}
                                    </div>
                                    <input
                                        type="radio"
                                        name="gender"
                                        className="hidden"
                                        onChange={() => setGender('male')}
                                        checked={gender === 'male'}
                                    />
                                    <span className="text-zinc-800 font-medium">남자</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section - White */}
                <div className="bg-white px-6 py-8 flex flex-col">
                    <h3 className="text-sm font-bold text-zinc-800 mb-4 ml-1">약관</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${terms.term1 ? 'bg-blue-600' : 'bg-zinc-300'}`}>
                                    <CheckIcon className="w-3 h-3 text-white" />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={terms.term1}
                                    onChange={() => setTerms(prev => ({ ...prev, term1: !prev.term1 }))}
                                />
                                <span className="text-zinc-800 text-sm">{TERMS_CONTENT.service.title}</span>
                                <span className="text-blue-600 font-medium text-sm whitespace-nowrap">(필수)</span>
                            </label>
                            <Button
                                variant="ghost"
                                className="text-xs text-zinc-400 underline p-0 h-auto hover:text-zinc-600"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveModal('service');
                                }}
                            >
                                자세히 보기
                            </Button>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${terms.term2 ? 'bg-blue-600' : 'bg-zinc-300'}`}>
                                    <CheckIcon className="w-3 h-3 text-white" />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={terms.term2}
                                    onChange={() => setTerms(prev => ({ ...prev, term2: !prev.term2 }))}
                                />
                                <span className="text-zinc-800 text-sm">개인정보 수집 및 이용 동의</span>
                                <span className="text-blue-600 font-medium text-sm whitespace-nowrap">(필수)</span>
                            </label>
                            <Button
                                variant="ghost"
                                className="text-xs text-zinc-400 underline p-0 h-auto hover:text-zinc-600"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveModal('privacy');
                                }}
                            >
                                자세히 보기
                            </Button>
                        </div>

                        {/* Phone Sharing Consent Preference Choice */}
                        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col gap-2.5">
                            <span className="text-zinc-800 text-sm font-bold">전화번호 제공 동의 설정 (선택)</span>
                            <span className="text-xs text-zinc-500 leading-normal">
                                시즌방/모임 서비스 이용 시 관리자에게 본인의 전화번호를 제공하는 방식입니다. 마이페이지에서 언제든지 변경할 수 있습니다.
                            </span>
                            <div className="flex gap-6 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="phoneConsentPref"
                                        value="each_time"
                                        checked={phoneConsentPreference === 'each_time'}
                                        onChange={() => setPhoneConsentPreference('each_time')}
                                        className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-sm text-zinc-700 font-medium">제공 시 매번 동의</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="phoneConsentPref"
                                        value="always"
                                        checked={phoneConsentPreference === 'always'}
                                        onChange={() => setPhoneConsentPreference('always')}
                                        className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-sm text-zinc-700 font-medium">항상 동의</span>
                                </label>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Confirm Button - Fixed Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-zinc-100 z-40">
                    <Button
                        className="w-full h-14 text-lg font-bold rounded-2xl bg-[#000000] hover:bg-zinc-800 text-white"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? '처리중...' : '확인'}
                    </Button>
                </div>

                {/* Terms Modal */}
                <TermsModal
                    isOpen={!!activeModal}
                    onClose={() => setActiveModal(null)}
                    title={activeModal ? TERMS_CONTENT[activeModal].title : ''}
                    content={activeModal ? TERMS_CONTENT[activeModal].content : ''}
                />

            </div>
        </div>
    );
}
