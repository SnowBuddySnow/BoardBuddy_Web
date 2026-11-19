import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

/** Keep the icon outside the input so shared input padding cannot overlap it. */
export default function SearchField({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <label className={`flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 focus-within:border-[#162660] focus-within:ring-2 focus-within:ring-[#162660]/10 ${className}`}>
        <Search aria-hidden="true" className="pointer-events-none h-4 w-4 shrink-0 text-zinc-400" />
        <input {...props} className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-50" />
    </label>;
}
