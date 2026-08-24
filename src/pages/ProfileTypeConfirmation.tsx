import { useEffect, useMemo, useRef, useState } from 'react';
import { GraduationCapIcon, UserRoundIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { getSchools, type SchoolOption } from '../services/schools';
import { confirmProfileType, getUserInfo } from '../services/user';
import { getApiErrorMessage } from '../lib/apiError';

interface ProfileTypeConfirmationProps {
    onSuccess: (requiresStudentVerification?: boolean) => void;
}

type Selection = 'STUDENT' | 'REGULAR';

export default function ProfileTypeConfirmation({ onSuccess }: ProfileTypeConfirmationProps) {
    const [selection, setSelection] = useState<Selection | null>(null);
    const [currentName, setCurrentName] = useState('');
    const [realName, setRealName] = useState('');
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [schoolQuery, setSchoolQuery] = useState('');
    const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
    const [studentNumber, setStudentNumber] = useState('');
    const [schoolEmail, setSchoolEmail] = useState('');
    const [showSchools, setShowSchools] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const schoolRef = useRef<HTMLDivElement>(null);
    const onSuccessRef = useRef(onSuccess);

    useEffect(() => {
        onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([getUserInfo(), getSchools()])
            .then(([user, options]) => {
                if (cancelled) return;
                if (user.userType !== 'GENERAL') {
                    onSuccessRef.current();
                    return;
                }
                setSchools(options);
                setCurrentName(user.name);
                setSchoolEmail(user.email || '');
                setStudentNumber(user.studentId || '');
                if (user.school) {
                    const matchedSchool = options.find(option => option.name === user.school) || null;
                    setSelection('STUDENT');
                    setSchoolQuery(user.school);
                    setSelectedSchool(matchedSchool);
                }
            })
            .catch((requestError: unknown) => {
                if (!cancelled) setError(getApiErrorMessage(requestError) || '프로필 정보를 불러오지 못했습니다.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const closeSchoolList = (event: MouseEvent) => {
            if (schoolRef.current && !schoolRef.current.contains(event.target as Node)) {
                setShowSchools(false);
            }
        };
        document.addEventListener('mousedown', closeSchoolList);
        return () => document.removeEventListener('mousedown', closeSchoolList);
    }, []);

    const filteredSchools = useMemo(() => {
        const query = schoolQuery.trim().toLocaleLowerCase('ko-KR');
        if (!query) return schools;
        return schools.filter(option => (
            option.name.toLocaleLowerCase('ko-KR').includes(query)
            || option.aliases.some(alias => alias.toLocaleLowerCase('ko-KR').includes(query))
        ));
    }, [schoolQuery, schools]);

    const chooseType = (nextSelection: Selection) => {
        setSelection(nextSelection);
        setError('');
        if (nextSelection === 'REGULAR') {
            setRealName('');
            setSchoolQuery('');
            setSelectedSchool(null);
            setStudentNumber('');
            setSchoolEmail('');
            setShowSchools(false);
        }
    };

    const submit = async () => {
        if (!selection) {
            setError('학생 또는 일반 프로필을 선택해주세요.');
            return;
        }
        if (selection === 'STUDENT' && !realName.trim()) {
            setError('재학 명단 확인을 위해 실명을 입력해주세요.');
            return;
        }
        if (selection === 'STUDENT' && !selectedSchool) {
            setError('검색 결과에서 학교를 선택해주세요.');
            return;
        }
        if (selection === 'STUDENT' && !studentNumber.trim()) {
            setError('동명이인을 구분할 수 있도록 학번을 입력해주세요.');
            return;
        }
        if (selection === 'STUDENT' && selectedSchool && selectedSchool.emailDomains.length > 0) {
            const normalizedEmail = schoolEmail.trim().toLowerCase();
            const emailDomain = normalizedEmail.split('@').pop() || '';
            const domainMatches = selectedSchool.emailDomains.some(domain => (
                emailDomain === domain.toLowerCase() || emailDomain.endsWith(`.${domain.toLowerCase()}`)
            ));
            if (!normalizedEmail || !domainMatches) {
                setError(`학교 이메일을 입력해주세요. 사용 가능한 도메인: ${selectedSchool.emailDomains.join(', ')}`);
                return;
            }
        }

        setSubmitting(true);
        setError('');
        try {
            const result = await confirmProfileType({
                userType: selection === 'STUDENT' ? 'KUSBF' : 'REGULAR',
                displayName: selection === 'STUDENT' ? realName.trim() : undefined,
                email: selection === 'STUDENT' ? schoolEmail.trim() || undefined : undefined,
                schoolId: selection === 'STUDENT' ? selectedSchool?.id : undefined,
                studentNumber: selection === 'STUDENT' ? studentNumber.trim() : undefined,
            });
            onSuccess(result.universityVerificationStatus === 'PENDING');
        } catch (requestError: unknown) {
            setError(getApiErrorMessage(requestError) || '프로필 유형을 저장하지 못했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full flex-1 items-center justify-center bg-[#F5F4F0]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#162660]" aria-label="프로필 정보 불러오는 중" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-1 overflow-y-auto bg-[#F5F4F0] px-5 py-8 sm:px-8">
            <main className="m-auto w-full max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-xl sm:p-10">
                <p className="text-sm font-black text-[#162660]">프로필 확인</p>
                <h1 className="mt-2 text-2xl font-black text-zinc-950">어떤 프로필을 사용하시나요?</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                    가입 방식이 변경되어 한 번만 확인이 필요합니다. 서비스와 이용 권한은 두 유형 모두 동일합니다.
                </p>

                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        aria-pressed={selection === 'STUDENT'}
                        onClick={() => chooseType('STUDENT')}
                        className={`flex min-h-28 items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                            selection === 'STUDENT'
                                ? 'border-[#162660] bg-blue-50 shadow-sm'
                                : 'border-zinc-200 bg-white hover:border-zinc-300'
                        }`}
                    >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-[#162660]">
                            <GraduationCapIcon className="h-6 w-6" />
                        </span>
                        <span>
                            <span className="block font-black text-zinc-900">학생</span>
                            <span className="mt-1 block text-xs leading-5 text-zinc-500">학교 정보를 프로필에 등록합니다.</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        aria-pressed={selection === 'REGULAR'}
                        onClick={() => chooseType('REGULAR')}
                        className={`flex min-h-28 items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                            selection === 'REGULAR'
                                ? 'border-[#162660] bg-blue-50 shadow-sm'
                                : 'border-zinc-200 bg-white hover:border-zinc-300'
                        }`}
                    >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
                            <UserRoundIcon className="h-6 w-6" />
                        </span>
                        <span>
                            <span className="block font-black text-zinc-900">일반</span>
                            <span className="mt-1 block text-xs leading-5 text-zinc-500">학교 정보 없이 계속 이용합니다.</span>
                        </span>
                    </button>
                </div>

                {selection === 'STUDENT' && (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="ml-1 text-sm font-bold text-zinc-800">실명</label>
                            <input
                                value={realName}
                                onChange={event => setRealName(event.target.value)}
                                maxLength={50}
                                placeholder={currentName ? `현재 프로필: ${currentName}` : '김보드'}
                                autoComplete="name"
                                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#162660] focus:ring-2 focus:ring-[#162660]/10"
                            />
                            <p className="ml-1 mt-2 text-xs leading-5 text-zinc-500">
                                크루 운영진이 재학 명단과 대조합니다. 닉네임이 아닌 실명을 다시 입력해주세요.
                            </p>
                        </div>
                        <div className="relative" ref={schoolRef}>
                            <label className="ml-1 text-sm font-bold text-zinc-800">학교</label>
                            <input
                                value={schoolQuery}
                                onChange={event => {
                                    setSchoolQuery(event.target.value);
                                    setSelectedSchool(null);
                                    setShowSchools(true);
                                }}
                                onFocus={() => setShowSchools(true)}
                                placeholder="학교명을 검색하세요"
                                autoComplete="off"
                                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#162660] focus:ring-2 focus:ring-[#162660]/10"
                            />
                            {showSchools && filteredSchools.length > 0 && (
                                <div className="absolute left-0 right-0 top-[78px] z-20 max-h-48 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl">
                                    {filteredSchools.map(option => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedSchool(option);
                                                setSchoolQuery(option.name);
                                                setShowSchools(false);
                                            }}
                                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50"
                                        >
                                            {option.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="ml-1 text-sm font-bold text-zinc-800">학번</label>
                            <input
                                value={studentNumber}
                                onChange={event => setStudentNumber(event.target.value)}
                                maxLength={30}
                                placeholder="20260001"
                                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#162660] focus:ring-2 focus:ring-[#162660]/10"
                            />
                            <p className="ml-1 mt-2 text-xs leading-5 text-zinc-500">
                                동일한 실명을 사용하는 학생을 구분하기 위해 필수입니다.
                            </p>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="ml-1 text-sm font-bold text-zinc-800">
                                학교 이메일
                                {selectedSchool?.emailDomains.length ? '' : ' (선택)'}
                            </label>
                            <input
                                type="email"
                                value={schoolEmail}
                                onChange={event => setSchoolEmail(event.target.value)}
                                maxLength={150}
                                placeholder={selectedSchool?.emailDomains[0] ? `name@${selectedSchool.emailDomains[0]}` : 'name@example.com'}
                                autoComplete="email"
                                className="mt-2 h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none focus:border-[#162660] focus:ring-2 focus:ring-[#162660]/10"
                            />
                            <p className="ml-1 mt-2 text-xs leading-5 text-zinc-500">
                                인증번호와 활성화 링크를 같은 이메일로 보내드립니다.
                            </p>
                        </div>
                    </div>
                )}

                {error && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

                <Button
                    type="button"
                    fullWidth
                    onClick={() => void submit()}
                    disabled={!selection || submitting}
                    className="mt-7 h-12 rounded-2xl border-[#162660] bg-[#162660] font-black hover:bg-[#0f1b48]"
                >
                    {submitting ? '저장 중...' : '확인하고 계속하기'}
                </Button>
            </main>
        </div>
    );
}
