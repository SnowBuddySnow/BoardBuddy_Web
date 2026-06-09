import { useState } from 'react';
import { Sliders, Check, RefreshCw, X, AlertTriangle } from 'lucide-react';

export default function DevPanel() {
    const [isOpen, setIsOpen] = useState(false);

    // Read current overrides
    const [crewOverride, setCrewOverride] = useState(localStorage.getItem('dev_crew_override') || 'server');
    const [roleOverride, setRoleOverride] = useState(localStorage.getItem('dev_role_override') || 'server');

    const handleApply = () => {
        if (crewOverride === 'server') {
            localStorage.removeItem('dev_crew_override');
        } else {
            localStorage.setItem('dev_crew_override', crewOverride);
        }

        if (roleOverride === 'server') {
            localStorage.removeItem('dev_role_override');
        } else {
            localStorage.setItem('dev_role_override', roleOverride);
        }

        window.location.reload();
    };

    const handleClear = () => {
        localStorage.removeItem('dev_crew_override');
        localStorage.removeItem('dev_role_override');
        window.location.reload();
    };

    return (
        <>
            {/* Floating Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-4 left-4 z-[9999] bg-zinc-900 text-white p-3.5 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:scale-105 transition-all flex items-center justify-center cursor-pointer border border-zinc-800"
                aria-label="Dev Menu"
            >
                {isOpen ? <X className="w-5 h-5" /> : <Sliders className="w-5 h-5" />}
            </button>

            {/* Dev Panel Overlay */}
            {isOpen && (
                <div className="fixed bottom-20 left-4 z-[9999] w-76 bg-white/95 backdrop-blur-md border border-zinc-200 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col gap-4 text-zinc-800 animate-in fade-in slide-in-from-bottom-5 duration-200">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <div className="flex items-center gap-1.5 font-black text-sm text-zinc-900 uppercase tracking-wide">
                            <Sliders className="w-4 h-4 text-zinc-500" />
                            <span>Dev State overrides</span>
                        </div>
                        <button
                            onClick={handleClear}
                            className="text-[10px] bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-md border border-zinc-200 font-bold transition-colors cursor-pointer text-zinc-600"
                        >
                            Reset All
                        </button>
                    </div>

                    {/* Sim warning */}
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-[10px] text-amber-800 leading-relaxed font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Overrides are visual-only on the client side. Backend API requests will still validate credentials.</span>
                    </div>

                    {/* Crew Simulation Group */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400">크루 상태 시뮬레이션</h4>
                        <div className="space-y-1.5">
                            {[
                                { id: 'server', label: 'Use Real Server State' },
                                { id: 'none', label: 'Simulate: No Crew' },
                                { id: 'has_crew', label: 'Simulate: In Crew (Team 401)' },
                                { id: 'pending', label: 'Simulate: Pending Application' },
                            ].map(opt => (
                                <label
                                    key={opt.id}
                                    className={`flex items-center justify-between px-3 py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                        crewOverride === opt.id
                                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                                            : 'bg-zinc-50 text-zinc-600 border-zinc-200/60 hover:bg-zinc-100'
                                    }`}
                                >
                                    <span>{opt.label}</span>
                                    <input
                                        type="radio"
                                        name="dev_crew_override"
                                        checked={crewOverride === opt.id}
                                        onChange={() => setCrewOverride(opt.id)}
                                        className="hidden"
                                    />
                                    {crewOverride === opt.id && <Check className="w-3.5 h-3.5" />}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Role / Permissions Simulation Group */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400">플랫폼 권한 시뮬레이션</h4>
                        <div className="space-y-1.5">
                            {[
                                { id: 'server', label: 'Use Real Server State' },
                                { id: 'admin', label: 'Simulate: Platform Admin' },
                                { id: 'organizer', label: 'Simulate: Party Organizer' },
                                { id: 'member', label: 'Simulate: Standard Member' },
                            ].map(opt => (
                                <label
                                    key={opt.id}
                                    className={`flex items-center justify-between px-3 py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                        roleOverride === opt.id
                                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                                            : 'bg-zinc-50 text-zinc-600 border-zinc-200/60 hover:bg-zinc-100'
                                    }`}
                                >
                                    <span>{opt.label}</span>
                                    <input
                                        type="radio"
                                        name="dev_role_override"
                                        checked={roleOverride === opt.id}
                                        onChange={() => setRoleOverride(opt.id)}
                                        className="hidden"
                                    />
                                    {roleOverride === opt.id && <Check className="w-3.5 h-3.5" />}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <button
                        onClick={handleApply}
                        className="w-full bg-[#162660] hover:bg-blue-900 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer border-none"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Apply & Refresh
                    </button>
                </div>
            )}
        </>
    );
}
