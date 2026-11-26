import type { FormEvent } from 'react';
import { Button } from '../Button';

export interface GuestApplicationDraft {
    name: string;
    school: string;
    crew: string;
    answer: string;
    privacyAccepted: boolean;
}

interface Props {
    draft: GuestApplicationDraft;
    question: string | null;
    pending: boolean;
    onChange: (draft: GuestApplicationDraft) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function EventGuestApplicationForm({ draft, question, pending, onChange, onSubmit }: Props) {
    return (
        <form className="space-y-4" onSubmit={onSubmit}>
            <fieldset disabled={pending} className="space-y-4">
                <legend className="mb-2 text-lg font-bold">비회원 신청자 정보</legend>
                {([
                    ['school', '소속 학교', 120],
                    ['crew', '소속 크루', 120],
                    ['name', '이름', 100],
                ] as const).map(([key, label, maxLength]) => (
                    <label key={key} className="block space-y-1 text-sm font-bold">
                        {label}
                        <input required value={draft[key]} maxLength={maxLength}
                            onChange={event => onChange({ ...draft, [key]: event.target.value })}
                            className="block w-full rounded-xl border border-zinc-200 p-3 text-base font-normal" />
                    </label>
                ))}
                {question && (
                    <label className="block space-y-1 text-sm font-bold">
                        {question} (선택)
                        <textarea value={draft.answer} maxLength={500} rows={3}
                            onChange={event => onChange({ ...draft, answer: event.target.value })}
                            className="block w-full rounded-xl border border-zinc-200 p-3 text-base font-normal" />
                    </label>
                )}
                <label className="flex gap-2 text-sm font-bold">
                    <input required type="checkbox" checked={draft.privacyAccepted}
                        onChange={event => onChange({ ...draft, privacyAccepted: event.target.checked })} />
                    행사 운영을 위한 개인정보 수집·이용에 동의합니다 (필수)
                </label>
                <p className="text-sm leading-relaxed text-zinc-600">
                    이름, 소속, 휴대전화 확인값, 선택 답변을 신청 관리와 본인 확인에 사용합니다.
                    개인정보는 행사 종료 30일 후 삭제합니다.
                </p>
                <Button type="submit" className="w-full" disabled={!draft.privacyAccepted || pending}>
                    {pending ? '신청하는 중…' : '참가 신청하기'}
                </Button>
            </fieldset>
        </form>
    );
}
