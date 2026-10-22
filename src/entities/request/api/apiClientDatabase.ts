import { historyEntryValidator, type HistoryEntry } from '../model/history.ts';
import { openRequestsValidator, type OpenRequests } from '../model/openRequests.ts';

import { defineDatabase, defineDatabaseStore } from '#shared/lib';

/** Sent requests, oldest dropped first */
export const historyStore = defineDatabaseStore<HistoryEntry>({
    name: 'history',
    keyPath: 'id',
    orderBy: 'sentAt',
    validator: historyEntryValidator,
});

/** The open tabs: one record under OPEN_REQUESTS_KEY */
export const openRequestsStore = defineDatabaseStore<OpenRequests>({
    name: 'openRequests',
    keyPath: 'id',
    validator: openRequestsValidator,
});

/** IndexedDB of the API client: bodies can be large, so they stay out of chrome.storage.local */
export const apiClientDatabase = defineDatabase({
    name: 'interceptkit-api-client',
    version: 1,
    stores: [historyStore, openRequestsStore],
});
