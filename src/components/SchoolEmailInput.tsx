import { useId, useState } from 'react';

interface Props { domains: string[]; value: string; onChange: (email: string) => void; }
const inputClass = 'h-12 w-full min-w-0 rounded-2xl border border-zinc-300 bg-white px-3 text-base text-zinc-900 focus-visible:outline-2 focus-visible:outline-[#162660]';
/** Domain selection assists input only; the backend still verifies school ownership. */
export function SchoolEmailInput({ domains, value, onChange }: Props) {
    const id = useId();
    const [domain, setDomain] = useState(() => domains.includes(value.split('@')[1]) ? value.split('@')[1] : domains[0] || '');
    const local = value.split('@')[0];
    if (!domains.length) return <label className="block text-sm font-bold text-[#162660]">학교 인증용 이메일 (선택)<input type="email" value={value} onChange={event => onChange(event.target.value)} autoComplete="email" placeholder="name@example.com" className={`mt-2 ${inputClass}`} /><span className="mt-2 block text-xs font-normal leading-6 text-zinc-600">학교를 선택하면 등록된 이메일 도메인을 안내해요.</span></label>;
    return <fieldset className="min-w-0"><legend className="text-sm font-bold text-[#162660]">학교 인증용 이메일 (선택)</legend>
        <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1.3fr)] items-center gap-2">
            <label htmlFor={id} className="sr-only">학교 이메일 아이디</label>
            <input id={id} value={local} onChange={event => { const name = event.target.value.replace(/@/g, ''); onChange(name ? `${name}@${domain}` : ''); }} autoComplete="username" placeholder="이메일 아이디" className={inputClass} />
            <span aria-hidden="true">@</span>
            <label htmlFor={`${id}-domain`} className="sr-only">학교 이메일 도메인</label>
            <select id={`${id}-domain`} value={domain} onChange={event => { setDomain(event.target.value); if (local) onChange(`${local}@${event.target.value}`); }} className={inputClass}>{domains.map(item => <option key={item} value={item}>{item}</option>)}</select>
        </div>
        <p className="mt-2 text-xs leading-6 text-zinc-600">선택한 학교의 도메인을 채웠어요. 이메일 아이디만 입력해 주세요. 이메일 인증 완료 후 학교 소속이 확인돼요.</p>
    </fieldset>;
}
