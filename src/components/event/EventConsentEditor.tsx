import { FileCheck2, Plus, Trash2 } from 'lucide-react';
import type { ConsentCategory, ConsentConfigurationInput, ConsentItemInput } from '../../types/api';

interface EventConsentEditorProps {
    value: ConsentConfigurationInput;
    onChange: (value: ConsentConfigurationInput) => void;
}

type TemplateKey = 'NONE' | 'SAFETY' | 'SAFETY_PRIVACY';

const safetyItem = (): ConsentItemInput => ({
    category: 'RISK_ACKNOWLEDGEMENT',
    title: '활동 위험 확인 및 안전수칙 동의',
    content: '활동 중 발생할 수 있는 위험과 주최자가 안내한 안전수칙을 확인했으며, 안전 장비 착용 및 현장 안내를 준수합니다.',
    required: true,
    displayOrder: 0,
});

const privacyItem = (): ConsentItemInput => ({
    category: 'PERSONAL_INFORMATION_COLLECTION_USE',
    title: '행사 운영을 위한 개인정보 수집·이용 동의',
    content: '참가 확인, 긴급 연락 및 행사 운영을 위해 신청 정보와 연락처를 행사 종료 후 필요한 기간 동안 이용하는 것에 동의합니다.',
    required: true,
    displayOrder: 1,
});

const templateItems = (key: TemplateKey): ConsentItemInput[] => {
    if (key === 'NONE') return [];
    if (key === 'SAFETY') return [safetyItem()];
    return [safetyItem(), privacyItem()];
};

const normalizeOrders = (items: ConsentItemInput[]) => (
    items.map((item, displayOrder) => ({ ...item, displayOrder }))
);

export function EventConsentEditor({ value, onChange }: EventConsentEditorProps) {
    const applyTemplate = (key: TemplateKey) => {
        const items = templateItems(key);
        onChange({
            consentWindowMinutes: items.length > 0 ? (value.consentWindowMinutes || 10) : null,
            items,
        });
    };

    const updateItem = (index: number, patch: Partial<ConsentItemInput>) => {
        onChange({
            ...value,
            items: value.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
        });
    };

    const addItem = () => {
        onChange({
            consentWindowMinutes: value.consentWindowMinutes || 10,
            items: normalizeOrders([...value.items, {
                category: 'OTHER',
                title: '',
                content: '',
                required: true,
                displayOrder: value.items.length,
            }]),
        });
    };

    const removeItem = (index: number) => {
        const items = normalizeOrders(value.items.filter((_, itemIndex) => itemIndex !== index));
        onChange({
            consentWindowMinutes: items.length > 0 ? (value.consentWindowMinutes || 10) : null,
            items,
        });
    };

    return (
        <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="flex items-start gap-3">
                <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-[#162660]" />
                <div>
                    <h2 className="text-sm font-bold text-zinc-900">참가 동의서</h2>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        참가 확정 전에 받을 동의서를 선택하거나 직접 수정하세요. 제공 문구는 초안이므로 행사 성격과 법적 요건에 맞게 검토해야 합니다.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                    ['NONE', '동의서 없음'],
                    ['SAFETY', '안전 확인'],
                    ['SAFETY_PRIVACY', '안전 + 개인정보'],
                ] as const).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => applyTemplate(key)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:border-[#162660]"
                    >
                        {label}
                    </button>
                ))}
            </div>

            {value.items.length > 0 && (
                <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-zinc-600">참가 후 동의 완료 시간</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            max={1440}
                            value={value.consentWindowMinutes || 10}
                            onChange={(event) => onChange({
                                ...value,
                                consentWindowMinutes: Math.max(1, Math.min(1440, Number(event.target.value) || 10)),
                            })}
                            className="w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                        />
                        <span className="text-xs text-zinc-500">분 이내</span>
                    </div>
                </label>
            )}

            <div className="space-y-3">
                {value.items.map((item, index) => (
                    <div key={index} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-center gap-2">
                            <select
                                value={item.category}
                                onChange={(event) => updateItem(index, { category: event.target.value as ConsentCategory })}
                                className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs"
                            >
                                <option value="RISK_ACKNOWLEDGEMENT">안전·위험 확인</option>
                                <option value="PERSONAL_INFORMATION_COLLECTION_USE">개인정보 수집·이용</option>
                                <option value="PHOTO_VIDEO_USE">사진·영상 활용</option>
                                <option value="OTHER">기타</option>
                            </select>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                                <input
                                    type="checkbox"
                                    checked={item.required}
                                    onChange={(event) => updateItem(index, { required: event.target.checked })}
                                />
                                필수
                            </label>
                            <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="rounded-full p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                aria-label="동의 항목 삭제"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <input
                            value={item.title}
                            onChange={(event) => updateItem(index, { title: event.target.value })}
                            placeholder="동의서 제목"
                            maxLength={200}
                            required
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                        />
                        <textarea
                            value={item.content}
                            onChange={(event) => updateItem(index, { content: event.target.value })}
                            placeholder="참가자에게 표시할 동의 내용"
                            rows={4}
                            required
                            className="w-full resize-y rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                        />
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs font-bold text-[#162660]"
            >
                <Plus className="h-4 w-4" />
                직접 항목 추가
            </button>
        </section>
    );
}
