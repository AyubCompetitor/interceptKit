import {
    apiClientDatabase,
    historyStore,
    mapResponseToSummary,
    type ApiRequest,
    type ApiResponse,
    type HistoryEntry,
} from '#entities/request';
import { API_CLIENT_CONFIG } from '#shared/config';
import { getRandomUUID } from '#shared/lib';
import { trimRecords, writeRecord } from '#shared/platform';

/** An entry for a request that went out; without a response when none came */
export const buildHistoryEntry = (
    request: ApiRequest,
    sentAt: number,
    response: NotRequired<ApiResponse>,
): HistoryEntry => {
    const entry = {
        id: getRandomUUID(),
        sentAt,
        request,
    };

    if (response === undefined) {
        return entry;
    }

    return { ...entry, response: mapResponseToSummary(response) };
};

/** Keeps the entry and drops the oldest ones beyond the limit of the history */
export const addHistoryEntry = async (entry: HistoryEntry): Promise<void> => {
    await writeRecord(apiClientDatabase, historyStore, entry);

    await trimRecords(apiClientDatabase, historyStore, API_CLIENT_CONFIG.HISTORY_LIMIT);
};
