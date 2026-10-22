import type { ConsentConfigurationInput } from '../types/api';
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

/** Each endpoint commits separately. Never race writes to the versioned Event row. */
export async function saveEventConfiguration(input: EventSaveInput): Promise<number> {
    let eventId = input.eventId ?? null;
    let stage: EventSaveStage = 'event';
    try {
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
