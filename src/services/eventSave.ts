import type { ApiResponse, ConsentConfigurationInput, Event } from '../types/api';
import apiClient from '../lib/axios';
import { isDevMode } from './devMocks';
import {
    configureEventConsents, configureEventRefundPolicy, createEvent, updateEvent,
    type CreateEventPayload, type UpdateEventPayload,
} from './event';

export type EventSaveStage = 'event' | 'consents' | 'refund';

export class EventSaveError extends Error {
    constructor(
        readonly eventId: number | null,
        readonly stage: EventSaveStage,
        readonly originalError: unknown,
    ) {
        super(`Event save failed at ${stage}`);
        this.name = 'EventSaveError';
    }
}

type EventSaveInput = {
    consentConfiguration: ConsentConfigurationInput;
    refundPolicy: string;
} & (
    | { eventId?: null; payload: CreateEventPayload; onCreated: (id: number) => void }
    | { eventId: number; payload: UpdateEventPayload; onCreated?: never; configurationLocked?: boolean }
);

/** Real saves use a single server transaction. Dev-only mocks retain their local adapters. */
export async function saveEventConfiguration(input: EventSaveInput): Promise<number> {
    let eventId = input.eventId ?? null;
    let stage: EventSaveStage = 'event';
    try {
        if (!isDevMode()) {
            if (input.eventId != null && input.configurationLocked) {
                await updateEvent(input.eventId, input.payload);
                return input.eventId;
            }
            const body = { event: input.payload, consents: input.consentConfiguration,
                refundPolicy: input.refundPolicy.trim() || null };
            const response = input.eventId == null
                ? await apiClient.post<ApiResponse<Event>>('/dashboard/events/configurations', body)
                : await apiClient.put<ApiResponse<Event>>(`/dashboard/events/${input.eventId}/configuration`, body);
            eventId = response.data.data.id;
            if (input.eventId == null) input.onCreated(eventId);
            return eventId;
        }
        if (input.eventId == null) {
            const event = await createEvent(input.payload);
            eventId = event.id;
            // Retain identity before either configuration request can fail.
            input.onCreated(eventId);
        } else {
            await updateEvent(input.eventId, input.payload);
            if (input.configurationLocked) return input.eventId;
        }
        stage = 'consents';
        await configureEventConsents(eventId!, input.consentConfiguration);
        stage = 'refund';
        await configureEventRefundPolicy(eventId!, input.refundPolicy.trim() || null);
        return eventId!;
    } catch (error) {
        throw new EventSaveError(eventId, stage, error);
    }
}
