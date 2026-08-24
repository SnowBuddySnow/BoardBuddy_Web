import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Eye, FileText, ReceiptText, RotateCcw, ShieldAlert, X } from 'lucide-react';

interface EventRefundPolicyEditorProps {
    value: string;
    onChange: (value: string) => void;
}

interface RefundPolicyTemplate {
    key: 'FLEXIBLE' | 'STANDARD' | 'STRICT';
    label: string;
    description: string;
    recommended?: boolean;
    content: string;
}

const commonPolicySections = `3. 호스트 취소 및 참가 제외
- 호스트가 이벤트를 취소한 경우: 예약금을 포함하여 참가자가 결제한 금액 전액을 환불합니다.
- 호스트의 운영상 사유로 참가자를 제외한 경우: 예약금을 포함하여 참가자가 결제한 금액 전액을 환불합니다.
- 안전수칙 위반, 반복적인 운영 방해 또는 허위 신청으로 참가자가 제외된 경우: 발생한 실비와 적용 사유를 안내한 뒤 환불 금액을 개별 심사합니다.

4. 일정 변경, 기상 및 안전 사유
- 이벤트 날짜 또는 핵심 일정이 변경되면 참가자는 호스트가 안내한 기한까지 변경 일정에 동의하거나 전액 환불을 요청할 수 있습니다.
- 기상 악화나 안전 문제로 이벤트가 취소되면 전액 환불합니다. 일정이 변경된 경우에는 참가자가 변경 일정에 동의한 때에만 참가 상태를 유지합니다.

5. 환불 요청 및 처리
- 환불 대상에 해당하면 이벤트 또는 크루 안내에 표시된 크루 매니저에게 직접 환불을 요청해 주세요.
- 크루 매니저가 적용 기준, 환불 가능 금액, 필요한 계좌 정보와 처리 방법을 확인하여 별도로 안내합니다.
- BoardBuddy는 환불 가능 여부를 자동으로 확정하거나 자동 송금하지 않습니다.
- 송금 또는 결제대행 수수료를 공제하는 경우에는 결제 전에 고지한 실제 비용만 공제합니다.

6. 이의 제기 및 예외
- 적용된 기준이나 금액이 다르다고 판단되면 이벤트 상세 화면에서 호스트에게 검토를 요청할 수 있습니다.
- 부상, 질병 등 예외 사유는 증빙과 실제 발생 비용을 확인하여 호스트가 별도로 심사할 수 있습니다.`;

const templates: RefundPolicyTemplate[] = [
    {
        key: 'FLEXIBLE',
        label: '유연형',
        description: '일정 변경 가능성이 큰 소규모 모임에 적합합니다.',
        content: `[취소 및 환불 정책]

1. 적용 기준 및 예약금
- 모든 취소 시각은 이벤트가 열리는 지역의 현지 시간을 기준으로 계산합니다.
- 결제 전에 별도로 고지된 예약금은 참가자가 취소하는 경우 환불되지 않습니다.
- 아래 환불 비율은 결제 금액에서 고지된 예약금을 제외한 환불 가능 잔액에 적용합니다. 예약금이 별도로 고지되지 않았다면 결제 금액 전체를 기준으로 합니다.
- 참가자가 크루 매니저에게 취소를 접수한 시각에 해당하는 기준을 적용합니다.

2. 참가자 취소
- 이벤트 시작 24시간 전까지: 환불 가능 잔액의 100% 환불
- 이벤트 시작 24시간 미만: 환불 가능 잔액의 50% 환불
- 사전 연락 없는 불참: 환불 불가

${commonPolicySections}`,
    },
    {
        key: 'STANDARD',
        label: '표준형',
        description: '준비 비용과 참가자의 취소 권리를 균형 있게 반영합니다.',
        recommended: true,
        content: `[취소 및 환불 정책]

1. 적용 기준 및 예약금
- 모든 취소 시각은 이벤트가 열리는 지역의 현지 시간을 기준으로 계산합니다.
- 결제 전에 별도로 고지된 예약금은 참가자가 취소하는 경우 환불되지 않습니다.
- 아래 환불 비율은 결제 금액에서 고지된 예약금을 제외한 환불 가능 잔액에 적용합니다. 예약금이 별도로 고지되지 않았다면 결제 금액 전체를 기준으로 합니다.
- 참가자가 크루 매니저에게 취소를 접수한 시각에 해당하는 기준을 적용합니다.

2. 참가자 취소
- 이벤트 시작 7일 전까지: 환불 가능 잔액의 100% 환불
- 이벤트 시작 72시간 전부터 7일 전 미만: 환불 가능 잔액의 80% 환불
- 이벤트 시작 24시간 전부터 72시간 전 미만: 환불 가능 잔액의 50% 환불
- 이벤트 시작 24시간 미만: 환불 불가
- 사전 연락 없는 불참: 환불 불가

${commonPolicySections}`,
    },
    {
        key: 'STRICT',
        label: '예약금 보호형',
        description: '환불 불가 예약금과 시설·장비 선결제 비중이 큰 이벤트에 적합합니다.',
        content: `[취소 및 환불 정책]

1. 적용 기준 및 예약금
- 모든 취소 시각은 이벤트가 열리는 지역의 현지 시간을 기준으로 계산합니다.
- 결제 전에 별도로 고지된 예약금은 참가자가 취소하는 경우 환불되지 않습니다.
- 아래 환불 비율은 결제 금액에서 고지된 예약금을 제외한 환불 가능 잔액에 적용합니다. 예약금이 별도로 고지되지 않았다면 결제 금액 전체를 기준으로 합니다.
- 참가자가 크루 매니저에게 취소를 접수한 시각에 해당하는 기준을 적용합니다.

2. 참가자 취소
- 이벤트 시작 7일 전까지: 환불 가능 잔액의 100% 환불
- 이벤트 시작 72시간 전부터 7일 전 미만: 환불 가능 잔액의 50% 환불
- 이벤트 시작 72시간 미만: 환불 불가
- 사전 연락 없는 불참: 환불 불가

${commonPolicySections}`,
    },
];

export function EventRefundPolicyEditor({ value, onChange }: EventRefundPolicyEditorProps) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const selectedTemplate = templates.find(template => template.content === value)?.key;

    useEffect(() => {
        if (!previewOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setPreviewOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewOpen]);

    const applyTemplate = (template: RefundPolicyTemplate) => {
        if (value.trim() && value !== template.content
            && !window.confirm('현재 작성한 정책을 선택한 템플릿으로 바꾸시겠습니까?')) {
            return;
        }
        onChange(template.content);
    };

    return (
        <section className="space-y-5 rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50/80 to-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-500 p-2 text-white">
                    <ReceiptText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-black text-zinc-900">취소·환불 정책</h2>
                        <div className="flex items-center gap-2">
                            {value.trim() && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">
                                    정책 설정됨
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => setPreviewOpen(true)}
                                disabled={!value.trim()}
                                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-amber-800 shadow-sm hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                미리보기
                            </button>
                        </div>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        참가자 취소, 호스트 취소, 일정 변경과 처리 기한을 한 문서로 안내합니다. 템플릿 적용 후 이벤트 상황에 맞게 검토해 주세요.
                    </p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {templates.map(template => {
                    const selected = selectedTemplate === template.key;
                    return (
                        <button
                            key={template.key}
                            type="button"
                            onClick={() => applyTemplate(template)}
                            className={`relative rounded-2xl border p-4 text-left transition-colors ${selected
                                ? 'border-amber-400 bg-amber-50 shadow-sm'
                                : 'border-zinc-200 bg-white hover:border-amber-300 hover:bg-amber-50/40'}`}
                        >
                            {template.recommended && (
                                <span className="absolute right-3 top-3 rounded-full bg-[#162660] px-2 py-0.5 text-[9px] font-black text-white">
                                    추천
                                </span>
                            )}
                            <span className="flex items-center gap-2 text-sm font-black text-zinc-900">
                                {selected ? <Check className="h-4 w-4 text-amber-600" /> : <FileText className="h-4 w-4 text-zinc-400" />}
                                {template.label}
                            </span>
                            <span className="mt-2 block pr-2 text-[11px] leading-relaxed text-zinc-500">
                                {template.description}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <label htmlFor="event-refund-policy" className="text-xs font-black text-zinc-700">참가자에게 표시할 정책</label>
                    <span className="text-[10px] font-semibold text-zinc-400">{value.length.toLocaleString()}/20,000자</span>
                </div>
                <textarea
                    id="event-refund-policy"
                    rows={18}
                    maxLength={20_000}
                    value={value}
                    onChange={event => onChange(event.target.value)}
                    placeholder="템플릿을 선택하거나 이벤트의 취소·환불 정책을 직접 작성해 주세요."
                    className="w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex max-w-xl items-start gap-1.5 text-[11px] leading-relaxed text-amber-800">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        템플릿은 일반적인 운영 예시입니다. 실제 비용 구조와 적용되는 규정을 확인하고, 참가 접수 전 최종 문구를 확정해 주세요.
                    </p>
                    {value && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm('취소·환불 정책을 비우시겠습니까?')) onChange('');
                            }}
                            className="flex items-center gap-1 text-[11px] font-black text-zinc-400 hover:text-red-600"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            정책 비우기
                        </button>
                    )}
                </div>
            </div>

            {previewOpen && createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-zinc-950/55 p-3 backdrop-blur-sm sm:p-6"
                    onMouseDown={event => {
                        if (event.currentTarget === event.target) setPreviewOpen(false);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="refund-policy-preview-title"
                        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[#FAF8F3] shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
                    >
                        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
                            <div className="flex items-center gap-3">
                                <span className="rounded-xl bg-amber-500 p-2 text-white"><Eye className="h-4 w-4" /></span>
                                <div>
                                    <h2 id="refund-policy-preview-title" className="text-sm font-black text-zinc-900">참가자 화면 미리보기</h2>
                                    <p className="text-[10px] font-semibold text-zinc-400">결제 전과 이벤트 상세 화면에 표시됩니다</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewOpen(false)}
                                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                aria-label="미리보기 닫기"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </header>
                        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                            <article className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="mb-4 flex items-center gap-3 border-b border-amber-100 pb-4">
                                    <span className="rounded-xl bg-amber-100 p-2 text-amber-700"><ReceiptText className="h-5 w-5" /></span>
                                    <div>
                                        <h3 className="text-base font-black text-zinc-900">취소 및 환불 안내</h3>
                                        <p className="text-xs text-zinc-500">신청 전에 아래 내용을 확인해 주세요.</p>
                                    </div>
                                </div>
                                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">{value}</p>
                            </article>
                        </div>
                    </section>
                </div>,
                document.body,
            )}
        </section>
    );
}
