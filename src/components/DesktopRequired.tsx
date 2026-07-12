import { MonitorUp } from 'lucide-react';

interface DesktopRequiredProps {
  onBack: () => void;
}

export default function DesktopRequired({ onBack }: DesktopRequiredProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#FAF8F3] px-6">
      <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#162660]/10 text-[#162660]">
          <MonitorUp className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-black text-zinc-900">데스크톱에서 관리해 주세요</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          관리 기능은 현재 1024px 이상의 화면에서 지원합니다. 일반 사용자 기능은 모바일에서도 계속 이용할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full rounded-xl border-0 bg-[#162660] px-4 py-3 text-sm font-bold text-white hover:bg-blue-900 cursor-pointer"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
