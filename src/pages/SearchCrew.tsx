import { ChevronLeftIcon } from 'lucide-react';
import { Button } from '../components/Button';

interface SearchCrewProps {
    onBack: () => void;
}

export default function SearchCrew({ onBack }: SearchCrewProps) {
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
            <header className="px-4 pt-2 pb-2 flex items-center justify-between relative z-10">
                <Button variant="ghost" onClick={onBack} className="-ml-2 gap-1 text-zinc-900 hover:bg-transparent">
                    <ChevronLeftIcon className="w-8 h-8" />
                </Button>
                <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-zinc-900">크루 검색</h1>
                <div className="w-8" />
            </header>

            <main className="flex-1 flex items-center justify-center px-6 pb-8">
                <p className="text-sm text-zinc-500">등록된 크루가 없습니다.</p>
            </main>
        </div>
    );
}
