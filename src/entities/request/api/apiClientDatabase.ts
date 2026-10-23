import { historyEntryValidator, type HistoryEntry } from '../model/history.ts';
import { openRequestsValidator, type OpenRequests } from '../model/openRequests.ts';

import { defineDatabase, defineDatabaseStore } from '#shared/lib';

export const historyStore = defineDatabaseStore<HistoryEntry>({
    name: 'history',
    keyPath: 'id',
    orderBy: 'sentAt',
    validator: historyEntryValidator,
});

export const openRequestsStore = defineDatabaseStore<OpenRequests>({
    name: 'openRequests',
    keyPath: 'id',
    validator: openRequestsValidator,
});

export const apiClientDatabase = defineDatabase({
    name: 'interceptkit-api-client',
    version: 1,
    stores: [historyStore, openRequestsStore],
});
