import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock3, Eye, Info, ShieldCheck, X } from 'lucide-react';
import type { ConsentItemInput } from '../../types/api';
import { ConsentResponseField } from './ConsentResponseField';
import { isConsentItemComplete, type ConsentDraft } from '../../lib/consentResponse';

interface EventConsentPreviewProps {
    items: ConsentItemInput[];
    consentWindowMinutes: number | null;
    open: boolean;
    onClose: () => void;
}

export function EventConsentPreview({ items, consentWindowMinutes, open, onClose }: EventConsentPreviewProps) {
    const [drafts, setDrafts] = useState<Record<number, ConsentDraft>>({});

    useEffect(() => {
        if (!open) return;
        setDrafts({});
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    const requiredItemEntries = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.required);
    const completedRequiredItems = requiredItemEntries.filter(({ item, index }) => (
        isConsentItemComplete(item, drafts[index])
    )).length;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-950/55 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
                if (event.currentTarget === event.target) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-consent-preview-title"
                className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[#FAF8F3] shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
            >
                <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-[#162660] p-2 text-white">
                            <Eye className="h-4 w-4" />
                        </span>
                        <div>
                            <h2 id="event-consent-preview-title" className="text-sm font-black text-zinc-900">참가자 화면 미리보기</h2>
                            <p className="text-[10px] font-semibold text-zinc-400">입력 내용은 저장되지 않습니다</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label="미리보기 닫기"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
                    <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                            <div className="flex items-start gap-3">
                                <div className="rounded-xl bg-amber-500 p-2 text-white shadow-sm">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-base font-black text-zinc-900">참가자 응답 시트</h3>
                                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-amber-700">
                                            필수 {completedRequiredItems}/{requiredItemEntries.length}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                                        필요한 항목을 작성하고 마지막에 한 번에 제출합니다.
                                    </p>
                                    {consentWindowMinutes && (
                                        <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-amber-700">
                                            <Clock3 className="h-3.5 w-3.5" />
                                            신청 후 {consentWindowMinutes}분 이내 작성
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="p-10 text-center">
                                <Info className="mx-auto h-8 w-8 text-zinc-300" />
                                <p className="mt-3 text-sm font-bold text-zinc-500">아직 응답 항목이 없습니다</p>
                                <p className="mt-1 text-xs text-zinc-400">미리보기를 닫고 템플릿이나 맞춤 항목을 추가해 주세요.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 p-4 sm:p-5">
                                {items.map((item, index) => {
                                    const isInformation = item.responseType === 'INFORMATION';
                                    const draft = drafts[index] || {};
                                    return (
                                        <section
                                            key={`${item.displayOrder}-${index}`}
                                            className={`rounded-2xl border p-4 ${
                                                isInformation ? 'border-blue-100 bg-blue-50/60' : 'border-zinc-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                                    isInformation ? 'bg-blue-100 text-[#162660]' : 'bg-zinc-100 text-zinc-500'
                                                }`}>
                                                    {isInformation ? <Info className="h-3.5 w-3.5" /> : index + 1}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="text-sm font-black text-zinc-900">{item.title || '제목 없는 항목'}</h4>
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                                            isInformation
                                                                ? 'bg-blue-100 text-[#162660]'
                                                                : item.required
                                                                    ? 'bg-red-50 text-red-600'
                                                                    : 'bg-zinc-100 text-zinc-500'
                                                        }`}>
                                                            {isInformation ? '안내' : item.required ? '필수' : '선택'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">
                                                        {item.content || '참가자에게 표시할 설명이 없습니다.'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ConsentResponseField
                                                item={item}
                                                draft={draft}
                                                onChange={(nextDraft) => setDrafts(current => ({ ...current, [index]: nextDraft }))}
                                            />
                                        </section>
                                    );
                                })}
                            </div>
                        )}

                        <div className="border-t border-zinc-100 bg-zinc-50 p-4 sm:p-5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-12 w-full rounded-xl bg-[#162660] text-sm font-black text-white shadow-sm"
                            >
                                미리보기 완료
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>,
        document.body,
    );
}
