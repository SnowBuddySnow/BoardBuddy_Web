import { useState } from 'react';
import {
    AlertTriangle,
    Camera,
    Check,
    ContactRound,
    Eye,
    FileCheck2,
    Info,
    NotepadText,
    Pill,
    Plus,
    ShieldCheck,
    Trash2,
    Utensils,
} from 'lucide-react';
import type {
    ConsentCategory,
    ConsentConfigurationInput,
    ConsentItemInput,
    ConsentResponseType,
} from '../../types/api';
import { EventConsentPreview } from './EventConsentPreview';

interface EventConsentEditorProps {
    value: ConsentConfigurationInput;
    onChange: (value: ConsentConfigurationInput) => void;
}

interface ConsentTemplate {
    key: string;
    group: 'CONSENT' | 'PARTICIPANT_INFO' | 'NOTICE';
    label: string;
    description: string;
    icon: typeof ShieldCheck;
    item: Omit<ConsentItemInput, 'displayOrder'>;
}

const templates: ConsentTemplate[] = [
    {
        key: 'SAFETY',
        group: 'CONSENT',
        label: '안전·위험 확인',
        description: '안전수칙과 활동 위험을 필수로 확인합니다.',
        icon: AlertTriangle,
        item: {
            category: 'RISK_ACKNOWLEDGEMENT',
            title: '활동 위험 확인 및 안전수칙 동의',
            content: '활동 중 발생할 수 있는 위험과 주최자가 안내한 안전수칙을 확인했으며, 안전 장비 착용 및 현장 안내를 준수합니다.',
            responseType: 'CHECKBOX',
            required: true,
        },
    },
    {
        key: 'PRIVACY',
        group: 'CONSENT',
        label: '개인정보 이용',
        description: '행사 운영에 필요한 정보 이용 동의를 받습니다.',
        icon: ShieldCheck,
        item: {
            category: 'PERSONAL_INFORMATION_COLLECTION_USE',
            title: '행사 운영을 위한 개인정보 수집·이용 동의',
            content: '참가 확인, 긴급 연락 및 행사 운영을 위해 신청 정보와 연락처를 행사 종료 후 필요한 기간 동안 이용하는 것에 동의합니다.',
            responseType: 'CHECKBOX',
            required: true,
        },
    },
    {
        key: 'PHOTO',
        group: 'CONSENT',
        label: '사진·영상 활용',
        description: '촬영물 활용 여부를 참가자가 선택합니다.',
        icon: Camera,
        item: {
            category: 'PHOTO_VIDEO_USE',
            title: '행사 사진·영상 활용 동의',
            content: '행사 기록과 후기 게시를 위해 촬영된 사진과 영상을 활용할 수 있습니다. 동의하지 않아도 참가할 수 있습니다.',
            responseType: 'CHECKBOX',
            required: false,
        },
    },
    {
        key: 'EMERGENCY',
        group: 'PARTICIPANT_INFO',
        label: '긴급 연락처',
        description: '비상시 연락할 사람과 전화번호를 입력받습니다.',
        icon: ContactRound,
        item: {
            category: 'EMERGENCY_CONTACT',
            title: '긴급 연락처',
            content: '비상 상황에서 연락할 수 있는 보호자 또는 지인의 전화번호를 입력해 주세요.',
            responseType: 'PHONE',
            required: true,
        },
    },
    {
        key: 'MEDICATION',
        group: 'PARTICIPANT_INFO',
        label: '복용 약물·건강 정보',
        description: '운영진이 알아야 할 건강 정보를 선택 입력받습니다.',
        icon: Pill,
        item: {
            category: 'MEDICATION_INFORMATION',
            title: '복용 약물 및 건강 유의사항',
            content: '안전한 행사 운영을 위해 현재 복용 중인 약물, 알러지 또는 현장에서 알아야 할 건강 유의사항이 있다면 작성해 주세요.',
            responseType: 'TEXTAREA',
            required: false,
        },
    },
    {
        key: 'ACCESSIBILITY',
        group: 'PARTICIPANT_INFO',
        label: '식이·접근성 요청',
        description: '식이 제한이나 접근성 지원 요청을 받습니다.',
        icon: Utensils,
        item: {
            category: 'DIETARY_ACCESSIBILITY',
            title: '식이 제한 및 접근성 지원 요청',
            content: '알러지, 식이 제한, 이동 또는 의사소통 지원 등 운영진이 준비해야 할 사항이 있다면 작성해 주세요.',
            responseType: 'TEXTAREA',
            required: false,
        },
    },
    {
        key: 'NOTICE',
        group: 'NOTICE',
        label: '안내문',
        description: '응답 없이 꼭 읽어야 할 정보를 보여줍니다.',
        icon: Info,
        item: {
            category: 'OTHER',
            title: '참가 전 안내',
            content: '참가자가 신청을 완료하기 전에 확인해야 할 준비물, 집결 방법 또는 운영 안내를 작성해 주세요.',
            responseType: 'INFORMATION',
            required: false,
        },
    },
];

const normalizeOrders = (items: ConsentItemInput[]) => (
    items.map((item, displayOrder) => ({ ...item, displayOrder }))
);

const matchesTemplate = (item: ConsentItemInput, template: ConsentTemplate) => (
    item.category === template.item.category
    && item.responseType === template.item.responseType
);

const responseTypeGroups: Array<{
    label: string;
    options: Array<{ value: ConsentResponseType; label: string }>;
}> = [
    {
        label: '동의·선택',
        options: [{ value: 'CHECKBOX', label: '동의 체크박스' }],
    },
    {
        label: '텍스트',
        options: [
            { value: 'TEXT', label: '짧은 답변' },
            { value: 'TEXTAREA', label: '장문형 답변' },
        ],
    },
    {
        label: '연락처·링크',
        options: [
            { value: 'PHONE', label: '전화번호' },
            { value: 'EMAIL', label: '이메일' },
            { value: 'URL', label: '웹 주소' },
        ],
    },
    {
        label: '숫자·일정',
        options: [
            { value: 'NUMBER', label: '숫자' },
            { value: 'DATE', label: '날짜' },
            { value: 'TIME', label: '시간' },
        ],
    },
    {
        label: '표시',
        options: [{ value: 'INFORMATION', label: '안내만 표시' }],
    },
];

const templateGroups = [
    {
        key: 'CONSENT' as const,
        label: '동의·확인',
        description: '참가자가 항목별로 체크',
        icon: ShieldCheck,
    },
    {
        key: 'PARTICIPANT_INFO' as const,
        label: '참가 정보',
        description: '운영에 필요한 내용을 입력',
        icon: ContactRound,
    },
];

export function EventConsentEditor({ value, onChange }: EventConsentEditorProps) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const replaceItems = (items: ConsentItemInput[]) => {
        const normalizedItems = normalizeOrders(items);
        onChange({
            consentWindowMinutes: normalizedItems.length > 0 ? (value.consentWindowMinutes || 10) : null,
            items: normalizedItems,
        });
    };

    const toggleTemplate = (template: ConsentTemplate) => {
        const isActive = value.items.some(item => matchesTemplate(item, template));
        if (isActive) {
            replaceItems(value.items.filter(item => !matchesTemplate(item, template)));
            return;
        }
        replaceItems([...value.items, { ...template.item, displayOrder: value.items.length }]);
    };

    const updateItem = (index: number, patch: Partial<ConsentItemInput>) => {
        const nextPatch = patch.responseType === 'INFORMATION'
            ? { ...patch, required: false }
            : patch;
        onChange({
            ...value,
            items: value.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...nextPatch } : item),
        });
    };

    const addItem = () => {
        replaceItems([...value.items, {
            category: 'OTHER',
            title: '',
            content: '',
            responseType: 'CHECKBOX',
            required: true,
            displayOrder: value.items.length,
        }]);
    };

    return (
        <section className="space-y-5 rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50/70 to-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#162660] p-2 text-white">
                    <FileCheck2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-black text-zinc-900">참가자 응답 시트</h2>
                        <div className="flex items-center gap-2">
                            {value.items.length > 0 && (
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black text-[#162660]">
                                    {value.items.length}개 항목
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => setPreviewOpen(true)}
                                className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-[#162660] shadow-sm hover:bg-blue-50"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                미리보기
                            </button>
                        </div>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        필요한 템플릿을 각각 선택해 한 장의 시트를 만드세요. 템플릿 문구는 행사 요건에 맞게 검토해 주세요.
                    </p>
                </div>
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-black text-zinc-700">빠른 템플릿</p>
                    <p className="text-[11px] text-zinc-400">여러 개 선택 가능</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {templateGroups.map(group => {
                        const GroupIcon = group.icon;
                        return (
                            <div key={group.key} className="rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
                                <div className="flex items-center gap-2 px-1.5 pb-2 pt-0.5">
                                    <span className="rounded-lg bg-blue-50 p-1.5 text-[#162660]">
                                        <GroupIcon className="h-3.5 w-3.5" />
                                    </span>
                                    <div>
                                        <p className="text-[11px] font-black text-zinc-700">{group.label}</p>
                                        <p className="text-[10px] text-zinc-400">{group.description}</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    {templates.filter(template => template.group === group.key).map(template => {
                                        const active = value.items.some(item => matchesTemplate(item, template));
                                        const Icon = template.icon;
                                        return (
                                            <button
                                                key={template.key}
                                                type="button"
                                                onClick={() => toggleTemplate(template)}
                                                aria-pressed={active}
                                                className={`relative flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                                                    active
                                                        ? 'border-[#162660] bg-[#162660] text-white shadow-sm'
                                                        : 'border-zinc-100 bg-zinc-50/70 text-zinc-700 hover:border-blue-200 hover:bg-blue-50/50'
                                                }`}
                                            >
                                                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-200' : 'text-[#162660]'}`} />
                                                <span className="min-w-0 pr-4">
                                                    <span className="block text-xs font-black">{template.label}</span>
                                                    <span className={`mt-0.5 block text-[10px] leading-snug ${active ? 'text-blue-100' : 'text-zinc-400'}`}>
                                                        {template.description}
                                                    </span>
                                                </span>
                                                {active && <Check className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {templates.filter(template => template.group === 'NOTICE').map(template => {
                    const active = value.items.some(item => matchesTemplate(item, template));
                    const Icon = template.icon;
                    return (
                        <button
                            key={template.key}
                            type="button"
                            onClick={() => toggleTemplate(template)}
                            aria-pressed={active}
                            className={`relative mt-2 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                                active
                                    ? 'border-[#162660] bg-[#162660] text-white shadow-sm'
                                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-blue-200 hover:bg-blue-50/50'
                            }`}
                        >
                            <span className={`rounded-lg p-1.5 ${active ? 'bg-white/10 text-blue-100' : 'bg-blue-50 text-[#162660]'}`}>
                                <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-2">
                                <span className="block text-xs font-black">{template.label}</span>
                                <span className={`block text-[10px] sm:before:mr-2 sm:before:content-['·'] ${active ? 'text-blue-100' : 'text-zinc-400'}`}>
                                    {template.description}
                                </span>
                            </span>
                            {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {value.items.length > 0 && (
                <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
                    <label className="block space-y-1.5">
                        <span className="text-[11px] font-black text-zinc-600">작성 제한시간</span>
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
                                className="w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold"
                            />
                            <span className="text-xs text-zinc-500">분</span>
                        </div>
                    </label>
                    <p className="pb-2 text-[11px] text-zinc-400">신청 후 이 시간 안에 필수 항목을 완료해야 합니다.</p>
                </div>
            )}

            <div className="space-y-3">
                {value.items.map((item, index) => (
                    <div key={index} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-black text-zinc-500">
                                {index + 1}
                            </span>
                            <select
                                value={item.category}
                                onChange={(event) => updateItem(index, { category: event.target.value as ConsentCategory })}
                                className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold"
                            >
                                <option value="RISK_ACKNOWLEDGEMENT">안전·위험 확인</option>
                                <option value="PERSONAL_INFORMATION_COLLECTION_USE">개인정보 수집·이용</option>
                                <option value="PERSONAL_INFORMATION_THIRD_PARTY_PROVISION">개인정보 제3자 제공</option>
                                <option value="SENSITIVE_INFORMATION">민감정보</option>
                                <option value="EMERGENCY_CONTACT">긴급 연락처</option>
                                <option value="MEDICATION_INFORMATION">복용 약물·건강 정보</option>
                                <option value="DIETARY_ACCESSIBILITY">식이·접근성</option>
                                <option value="PHOTO_VIDEO_USE">사진·영상 활용</option>
                                <option value="MARKETING">마케팅</option>
                                <option value="OTHER">기타</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => replaceItems(value.items.filter((_, itemIndex) => itemIndex !== index))}
                                className="rounded-full p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                aria-label={`${index + 1}번 항목 삭제`}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <label className="space-y-1">
                                <span className="text-[11px] font-bold text-zinc-500">응답 방식</span>
                                <select
                                    value={item.responseType}
                                    onChange={(event) => updateItem(index, { responseType: event.target.value as ConsentResponseType })}
                                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold"
                                >
                                    {responseTypeGroups.map(group => (
                                        <optgroup key={group.label} label={group.label}>
                                            {group.options.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </label>
                            {item.responseType !== 'INFORMATION' && (
                                <label className="flex items-end">
                                    <span className="flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-600">
                                        <input
                                            type="checkbox"
                                            checked={item.required}
                                            onChange={(event) => updateItem(index, { required: event.target.checked })}
                                            className="h-4 w-4 accent-[#162660]"
                                        />
                                        필수 응답
                                    </span>
                                </label>
                            )}
                        </div>

                        <input
                            value={item.title}
                            onChange={(event) => updateItem(index, { title: event.target.value })}
                            placeholder="항목 제목"
                            maxLength={200}
                            required
                            className="mb-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold"
                        />
                        <textarea
                            value={item.content}
                            onChange={(event) => updateItem(index, { content: event.target.value })}
                            placeholder="참가자에게 보여줄 설명 또는 안내문"
                            rows={3}
                            required
                            className="w-full resize-y rounded-xl border border-zinc-200 px-3 py-2 text-sm leading-relaxed"
                        />
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addItem}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 py-3 text-xs font-black text-[#162660] hover:bg-blue-50"
            >
                <Plus className="h-4 w-4" />
                맞춤 항목 추가
            </button>

            {value.items.length === 0 && (
                <div className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
                    <NotepadText className="h-4 w-4" />
                    템플릿을 선택하거나 맞춤 항목을 추가하면 참가자 응답 시트가 생성됩니다.
                </div>
            )}

            <EventConsentPreview
                items={value.items}
                consentWindowMinutes={value.consentWindowMinutes}
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
            />
        </section>
    );
}
