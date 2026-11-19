import axios from 'axios';
import type { ApiResponse } from '../types/api';
// Public introduction requests must work without, and never refresh, an account credential.
const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', timeout: 10_000 });
export interface InvitationPreview { crewName: string; schoolName: string | null; expiresAt: string; approvalRequired: true; }
export const previewCrewInvitation = async (token: string): Promise<InvitationPreview> =>
    (await apiClient.post<ApiResponse<InvitationPreview>>('/public/crew-invitations/preview', { token })).data.data;
