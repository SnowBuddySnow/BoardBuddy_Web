import { ChevronLeftIcon, GraduationCapIcon, UserRoundIcon } from 'lucide-react';
import { Button } from '../components/Button';

export type SignupUserType = 'GENERAL' | 'KUSBF';

interface UserTypeSelectionProps {
    onBack: () => void;
    onSelect: (userType: SignupUserType) => void;
}

export default function UserTypeSelection({ onBack, onSelect }: UserTypeSelectionProps) {
    return (
        <div className="flex-1 flex flex-col h-full bg-[#F7F9FC] dark:bg-zinc-950 px-6 py-4 lg:px-10 lg:py-8">
            <header className="flex items-center relative">
                <Button variant="ghost" onClick={onBack} className="-ml-2 text-zinc-900 dark:text-white">
                    <ChevronLeftIcon className="w-6 h-6" />
                </Button>
            </header>

            <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-8">
                <div className="mb-10 text-center">
                    <p className="text-sm font-semibold text-blue-600 mb-2">회원 유형 선택</p>
                    <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">어떤 회원으로 가입하시나요?</h1>
                    <p className="text-sm text-zinc-500 mt-3">선택한 유형에 맞는 정보만 입력받습니다.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
                    <button
                        type="button"
                        onClick={() => onSelect('KUSBF')}
                        className="min-h-64 rounded-3xl bg-[#DCEBFA] border-2 border-transparent p-5 flex flex-col items-center justify-between text-center shadow-sm transition hover:border-blue-500 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:min-h-80 lg:p-8"
                    >
                        <div className="w-full flex-1 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-3xl bg-white/80 flex items-center justify-center text-blue-700">
                                <GraduationCapIcon className="w-12 h-12" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-950">KUSBF 회원</h2>
                            <p className="text-xs leading-5 text-zinc-600 mt-2">학교 및 학번 정보를 등록합니다.</p>
                            <p className="text-[10px] text-blue-700 mt-3">KUSBF 로고 추가 예정</p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelect('GENERAL')}
                        className="min-h-64 rounded-3xl bg-white border-2 border-zinc-100 p-5 flex flex-col items-center justify-between text-center shadow-sm transition hover:border-blue-500 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900 dark:border-zinc-800 lg:min-h-80 lg:p-8"
                    >
                        <div className="w-full flex-1 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-3xl bg-zinc-100 flex items-center justify-center text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                <UserRoundIcon className="w-11 h-11" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">일반 회원</h2>
                            <p className="text-xs leading-5 text-zinc-600 mt-2 dark:text-zinc-400">학교 정보 없이 닉네임으로 가입합니다.</p>
                        </div>
                    </button>
                </div>
            </main>
        </div>
    );
}
