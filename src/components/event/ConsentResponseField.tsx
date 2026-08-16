import type { HTMLInputTypeAttribute } from 'react';
import type { ConsentResponseType } from '../../types/api';
import type { ConsentDraft, ConsentFieldItem } from '../../lib/consentResponse';

const inputConfig: Partial<Record<ConsentResponseType, {
    type: HTMLInputTypeAttribute;
    inputMode?: 'text' | 'email' | 'tel' | 'decimal' | 'url';
    autoComplete?: string;
    placeholder: string;
}>> = {
    TEXT: { type: 'text', inputMode: 'text', placeholder: '짧은 답변을 입력해 주세요' },
    EMAIL: { type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'name@example.com' },
    PHONE: { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '010-1234-5678' },
    NUMBER: { type: 'number', inputMode: 'decimal', placeholder: '숫자를 입력해 주세요' },
    DATE: { type: 'date', placeholder: '날짜를 선택해 주세요' },
    TIME: { type: 'time', placeholder: '시간을 선택해 주세요' },
    URL: { type: 'url', inputMode: 'url', autoComplete: 'url', placeholder: 'https://example.com' },
};

interface ConsentResponseFieldProps {
    item: ConsentFieldItem;
    draft?: ConsentDraft;
    onChange: (draft: ConsentDraft) => void;
}

export function ConsentResponseField({ item, draft = {}, onChange }: ConsentResponseFieldProps) {
    if (item.responseType === 'CHECKBOX') {
        return (
            <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                draft.agreed
                    ? 'border-[#162660] bg-blue-50 text-[#162660]'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
            }`}>
                <input
                    type="checkbox"
                    checked={draft.agreed === true}
                    onChange={(event) => onChange({ ...draft, agreed: event.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#162660]"
                />
                <span className="text-xs font-bold leading-relaxed">
                    {item.required ? '내용을 확인했으며 동의합니다.' : '이 선택 항목에 동의합니다.'}
                </span>
            </label>
        );
    }

    if (item.responseType === 'TEXTAREA') {
        return (
            <div className="mt-4">
                <textarea
                    value={draft.responseText || ''}
                    onChange={(event) => onChange({ ...draft, responseText: event.target.value })}
                    maxLength={5000}
                    rows={3}
                    aria-label={`${item.title} 응답`}
                    placeholder={item.required ? '필수 정보를 입력해 주세요' : '없으면 비워두어도 됩니다'}
                    className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm leading-relaxed outline-none transition focus:border-[#162660] focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-right text-[10px] text-zinc-400">
                    {(draft.responseText || '').length}/5,000
                </p>
            </div>
        );
    }

    const config = inputConfig[item.responseType];
    if (!config) return null;

    return (
        <input
            type={config.type}
            inputMode={config.inputMode}
            autoComplete={config.autoComplete}
            value={draft.responseText || ''}
            onChange={(event) => onChange({ ...draft, responseText: event.target.value })}
            maxLength={item.responseType === 'NUMBER' || item.responseType === 'DATE' || item.responseType === 'TIME' ? undefined : 5000}
            aria-label={`${item.title} 응답`}
            placeholder={config.placeholder}
            className="mt-4 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-[#162660] focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
    );
}
