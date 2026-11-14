import buddy from '../assets/buddy-soft.png';
export default function BuddyNote({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-3"><img src={buddy} alt="" width={64} height={64} loading="lazy" decoding="async" className="h-16 w-16 shrink-0 object-contain" /><div className="text-sm leading-6 text-slate-600">{children}</div></div>;
}
