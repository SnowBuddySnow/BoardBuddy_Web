import { Button } from '../components/Button';
import { ChevronLeftIcon, CheckIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TermsModal } from '../components/TermsModal';

interface UserInfoInputProps {
    onBack: () => void;

}

const SCHOOL_DATA = [
    { name: '홍익대학교', aliases: ['홍대', 'hongik university', 'hongik'] },
    { name: '충남대학교', aliases: ['충남대', '충대', 'chungnam national university', 'chungnam', 'cnu'] },
    { name: '카이스트', aliases: ['한국과학기술원', 'kaist'] },
    { name: '세종대학교', aliases: ['세종대', 'sejong university', 'sejong'] },
    { name: '이화여자대학교', aliases: ['이대', 'ewha womans university', 'ewha'] },
    { name: '숙명여자대학교', aliases: ['숙대', 'sookmyung womens university', 'sookmyung'] },
];

const TERMS_CONTENT = {
    service: {
        title: '베타 테스트 서비스 이용약관',
        content: `제1조 (목적)
본 약관은 '보드버디(BoardBuddy)'(이하 "서비스")가 제공하는 베타 테스트 서비스의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다. 본 서비스는 시즌방 운영진의 효율적인 관리와 이용자들의 편리한 예약 및 정보 확인을 돕기 위해 제공됩니다.

제2조 (베타 테스트의 특수성 및 한계)
1. 개발팀은 테스트 목적에 따라 사전 예고 없이 서비스의 기능, UI 등을 변경하거나 서비스를 일시 중단할 수 있습니다.
2. 베타 테스트 기간 중 생성된 데이터(예약 내역, 회원 정보 등)는 정식 서비스 출시 시 이관되지 않을 수 있으며, 테스트 종료 후 초기화될 수 있습니다.
3. 이용자는 본 서비스가 테스트 목적임을 인지합니다.`
    },
    privacy: {
        title: '개인정보 수집 및 이용 동의',
        content: `'보드버디'는 베타 테스트 진행을 위해 최소한의 개인정보만을 수집하며, 수집된 정보는 테스트 종료 후 안전하게 파기됩니다. 제3자에게 제공하지 않습니다.

1. 수집 및 이용 목적
- 베타 테스트 서비스 제공 (본인 확인 및 회원 관리)
- 시즌방 예약 및 이용 현황 관리
- 서비스 관련 공지 및 피드백 수집

2. 수집 항목
- 성명, 휴대전화번호, 소속(대학교/동아리명), 학번, 생년월일

3. 보유 및 이용 기간
- 베타 테스트 종료 시까지
(단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간까지 보관 후 파기)

4. 동의 거부 권리
- 귀하는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 다만, 필수 항목 동의를 거부할 경우 베타 테스트 참여 및 서비스 이용이 불가능합니다.`
    }
};

export default function UserInfoInput({ onBack }: UserInfoInputProps) {
    const [name, setName] = useState('');
    const [school, setSchool] = useState('');
    const [studentId, setStudentId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<'female' | 'male' | null>(null);
    const [terms, setTerms] = useState({
        term1: false,
        term2: false,
    });
    const [activeModal, setActiveModal] = useState<'service' | 'privacy' | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // School Search State
    const [filteredSchools, setFilteredSchools] = useState<{ name: string; aliases: string[] }[]>([]);
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
        const filtered = SCHOOL_DATA.filter(item =>
            item.name.toLowerCase().includes(lowerValue) ||
            item.aliases.some(alias => alias.includes(lowerValue))
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
        if (!name) { alert('이름을 입력해주세요.'); return; }
        if (!birthDate) { alert('생년월일을 입력해주세요.'); return; }
        if (!school) { alert('학교를 입력해주세요.'); return; }
        if (!studentId) { alert('학번을 입력해주세요.'); return; }
        if (!phoneNumber) { alert('전화번호를 입력해주세요.'); return; }
        if (!gender) { alert('성별을 선택해주세요.'); return; }

        if (!terms.term1) { alert('첫 번째 필수 약관에 동의해주세요.'); return; }
        if (!terms.term2) { alert('두 번째 필수 약관에 동의해주세요.'); return; }

        // Phone number format validation (010-XXXX-XXXX)
        const phoneRegex = /^010-\d{4}-\d{4}$/;
        if (!phoneRegex.test(phoneNumber)) {
            alert('전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)');
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('tempAccessToken');

            if (!token) {
                alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
                onBack();
                return;
            }

            const response = await fetch('/api/auth/signup/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    birthDate: birthDate, // YYYY-MM-DD
                    school,
                    studentId,
                    gender: gender === 'male' ? 'MALE' : 'FEMALE',
                    phoneNumber
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('회원가입이 완료되었습니다.');
                // Update token if response contains new token (usually it does)
                if (data.data && data.data.accessToken) {
                    localStorage.setItem('accessToken', data.data.accessToken);
                    localStorage.setItem('refreshToken', data.data.refreshToken);
                    localStorage.removeItem('tempAccessToken');
                }
                onBack(); // Navigate back (usually to login or directly to home if guarded)
            } else {
                alert(data.message || '회원가입 중 오류가 발생했습니다.');
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
                            <label className="text-sm font-bold text-zinc-800 ml-1">이름</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                                placeholder="홍길동"
                            />
                            <p className="text-xs text-zinc-600 ml-1">동아리 운영진이 식별 가능하도록 실명으로 작성해주세요.</p>
                        </div>

                        {/* BirthDate */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-800 ml-1">생년월일</label>
                            <input
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                            />
                        </div>

                        {/* School (Dropdown) */}
                        <div className="space-y-2 relative" ref={schoolInputRef}>
                            <label className="text-sm font-bold text-zinc-800 ml-1">학교</label>
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
                                            {item.aliases.length > 0 && (
                                                <span className="text-zinc-400 text-xs ml-2">({item.aliases[0]})</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Student ID */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-800 ml-1">학번</label>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                className="w-full h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                                placeholder="20230001"
                            />
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-800 ml-1">전화번호</label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={handlePhoneChange}
                                maxLength={13}
                                className="w-full h-12 rounded-[16px] border-none px-4 text-zinc-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                                placeholder="010-0000-0000"
                            />
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
