import { identifier, number, object, optional, type Validator } from '#shared/lib';

import type { ApiResponse } from './apiResponse.ts';
import { apiRequestValidator, type ApiRequest } from './request.ts';

/** What the history keeps of a response: never its body */
export interface ResponseSummary {
    /** HTTP status code */
    readonly status: number;
    /** Milliseconds from sending to the end of the body */
    readonly durationMs: number;
    /** Size of the body in bytes */
    readonly size: number;
}

/** A request that went out */
export interface HistoryEntry {
    /** Unique id of the entry */
    readonly id: string;
    /** When the request went, in milliseconds since the epoch */
    readonly sentAt: number;
    /** The request as typed, with {{variables}} and without their values */
    readonly request: ApiRequest;
    /** What came back; none when no response came */
    readonly response?: ResponseSummary;
}

const count = number({ integer: true, min: 0 });

const responseSummary: Validator<ResponseSummary> = object({
    status: number({ integer: true, min: 100, max: 999 }),
    durationMs: count,
    size: count,
});

export const historyEntryValidator: Validator<HistoryEntry> = object({
    id: identifier,
    sentAt: count,
    request: apiRequestValidator,
    response: optional(responseSummary),
});

export const mapResponseToSummary = (response: ApiResponse): ResponseSummary => ({
    status: response.status,
    durationMs: response.durationMs,
    size: response.size,
});

/** The newest request first */
export const sortHistoryEntries = (entries: readonly HistoryEntry[]): HistoryEntry[] => {
    return entries.toSorted((first, second) => second.sentAt - first.sentAt);
};
