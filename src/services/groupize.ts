import apiClient from '../lib/axios';
import type { ApiResponse, EventPlanningMode, EventStatus, ParticipantStatus, PaymentStatus } from '../types/api';

export interface Placement { userId: number; childEventId: number; locked: boolean }
export interface GroupizeChild {
    id: number; title: string; capacity: number | null; startsAt: string; status: EventStatus; planningMode: EventPlanningMode;
}
export interface GroupizeApplicant {
    userId: number; name: string; status: ParticipantStatus; eligible: boolean; crewId: number | null;
    paymentStatus: PaymentStatus | null; childStatus: ParticipantStatus | null;
}
export interface GroupizeState {
    parentEventId: number; parentTitle: string; enabled: boolean; maximumApplicants: number | null;
    revisionToken: string; children: GroupizeChild[]; applicants: GroupizeApplicant[]; placements: Placement[];
}
export interface AllocationPlan { revisionToken: string; placements: Placement[]; unassignedUserIds: number[] }
export interface FamilyEvent { id: number; title: string; status: EventStatus; currentUserStatus: ParticipantStatus | null }
export interface EventFamily { parent: FamilyEvent | null; children: FamilyEvent[] }

export const getGroupize = async (id: number): Promise<GroupizeState> =>
    (await apiClient.get<ApiResponse<GroupizeState>>(`/dashboard/events/${id}/groupize`)).data.data;

export const configureGroupize = async (id: number, maximumApplicants: number | null, revisionToken: string): Promise<GroupizeState> =>
    (await apiClient.put<ApiResponse<GroupizeState>>(`/dashboard/events/${id}/groupize/configuration`, { maximumApplicants, revisionToken })).data.data;

export const createSubevents = async (id: number, revisionToken: string,
    children: { title?: string; capacity?: number; capacityLimited?: boolean }[]): Promise<GroupizeState> =>
    (await apiClient.post<ApiResponse<GroupizeState>>(`/dashboard/events/${id}/groupize/children`, { revisionToken, children })).data.data;

export const previewAllocation = async (id: number, revisionToken: string, placements: Placement[], randomize: boolean): Promise<AllocationPlan> =>
    (await apiClient.post<ApiResponse<AllocationPlan>>(`/dashboard/events/${id}/groupize/preview`, { revisionToken, placements, randomize })).data.data;

export const applyAllocation = async (id: number, plan: AllocationPlan): Promise<GroupizeState> =>
    (await apiClient.put<ApiResponse<GroupizeState>>(`/dashboard/events/${id}/groupize/assignments`,
        { revisionToken: plan.revisionToken, placements: plan.placements })).data.data;

export const getEventFamily = async (id: number): Promise<EventFamily> =>
    (await apiClient.get<ApiResponse<EventFamily>>(`/events/${id}/family`)).data.data;
