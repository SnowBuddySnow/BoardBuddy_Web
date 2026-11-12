import axios from 'axios';
import { clearAuthSession, getRefreshToken } from '../lib/session';
import { clearCrewInvitationIntent } from '../lib/onboardingIntent';

/** Clear local access immediately; revoke the server refresh family without replay/interceptors. */
export const signOut = async (): Promise<void> => {
    const refreshToken = getRefreshToken();
    clearAuthSession();
    clearCrewInvitationIntent();
    if (!refreshToken) return;
    try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/logout`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` }, timeout: 5_000,
        });
    } catch {
        // Offline logout still removes this browser's credentials. The server token retains its
        // normal expiry if revocation could not be delivered; never restore it into local storage.
    }
};
