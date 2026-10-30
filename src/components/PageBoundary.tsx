import { Component, Suspense, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    onBack: () => void;
}

/** A failed screen/chunk must not leave the app blank or expose raw exception text. */
export default class PageBoundary extends Component<Props, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (this.state.failed) {
            return (
                <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 bg-[#FAF8F3] px-6 text-center">
                    <h1 className="text-xl font-bold text-zinc-900">화면을 불러오지 못했습니다</h1>
                    <p className="max-w-md text-sm text-zinc-600">
                        연결 상태를 확인한 뒤 페이지를 새로고침해 주세요. 저장 여부가 불확실하면 목록에서 먼저 확인하고, 신청이나 결제를 반복하지 마세요.
                    </p>
                    <button type="button" onClick={this.props.onBack} className="rounded-xl bg-[#162660] px-5 py-3 font-bold text-white">
                        홈으로 돌아가기
                    </button>
                </div>
            );
        }
        return (
            <Suspense fallback={<div role="status" className="flex h-full items-center justify-center text-sm text-zinc-500">화면을 불러오는 중...</div>}>
                {this.props.children}
            </Suspense>
        );
    }
}
