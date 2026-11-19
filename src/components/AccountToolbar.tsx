import { CircleUserRound } from 'lucide-react';
import NotificationBell from './NotificationBell';
import boardBuddyLogo from '../assets/boardbuddy-logo.png';

export default function AccountToolbar({ onHome, onProfile, onNotifications, onManage, notificationRefreshKey = 0 }: {
    onHome: () => void;
    onProfile: () => void;
    onNotifications: () => void;
    onManage?: () => void;
    notificationRefreshKey?: number;
}) {
    return <header aria-label="계정 메뉴" className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-100 bg-white px-4">
        <button type="button" onClick={onHome} aria-label="BoardBuddy 홈" className="h-8 w-28 shrink-0 border-0 bg-transparent p-0">
            <img src={boardBuddyLogo} alt="BoardBuddy" className="h-full w-full object-cover" />
        </button>
        <div className="flex items-center gap-1">
            {onManage && <button type="button" onClick={onManage} className="min-h-10 rounded-xl px-2 text-xs font-bold text-[#162660]">운영 센터</button>}
            <button type="button" onClick={onProfile} aria-label="내 정보" className="flex h-10 w-10 items-center justify-center rounded-full text-[#162660] hover:bg-blue-50"><CircleUserRound className="h-5 w-5" /></button>
            <NotificationBell variant="icon" refreshKey={notificationRefreshKey} onClick={onNotifications} />
        </div>
    </header>;
}
