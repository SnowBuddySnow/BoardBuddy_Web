import BuddyMascot from "./BuddyMascot";
export default function BuddyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <BuddyMascot size={40} />
      <div className="text-sm leading-6 text-slate-600">{children}</div>
    </div>
  );
}
