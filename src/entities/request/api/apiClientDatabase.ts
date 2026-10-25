import { collectionValidator, type Collection } from '../model/collection.ts';
import { historyEntryValidator, type HistoryEntry } from '../model/history.ts';
import { openRequestsValidator, type OpenRequests } from '../model/openRequests.ts';
import { QUERY_IN_URL_VERSION, upgradeRequestQuery } from '../model/queryUpgrade.ts';

import { defineDatabase, defineDatabaseStore } from '#shared/lib';

const COLLECTIONS_VERSION = 3;

const upgradeHistoryEntry = (entry: HistoryEntry, oldVersion: number): HistoryEntry => {
    if (oldVersion >= QUERY_IN_URL_VERSION) {
        return entry;
    }

    return {
        ...entry,
        request: upgradeRequestQuery(entry.request),
    };
};

const upgradeOpenRequests = (openRequests: OpenRequests, oldVersion: number): OpenRequests => {
    if (oldVersion >= QUERY_IN_URL_VERSION) {
        return openRequests;
    }

    return {
        ...openRequests,
        requests: openRequests.requests.map(upgradeRequestQuery),
    };
};

export const historyStore = defineDatabaseStore<HistoryEntry>({
    name: 'history',
    keyPath: 'id',
    orderBy: 'sentAt',
    validator: historyEntryValidator,
    upgrade: upgradeHistoryEntry,
});

export const openRequestsStore = defineDatabaseStore<OpenRequests>({
    name: 'openRequests',
    keyPath: 'id',
    validator: openRequestsValidator,
    upgrade: upgradeOpenRequests,
});

export const collectionsStore = defineDatabaseStore<Collection>({
    name: 'collections',
    keyPath: 'id',
    validator: collectionValidator,
});

export const apiClientDatabase = defineDatabase({
    name: 'interceptkit-api-client',
    version: COLLECTIONS_VERSION,
    stores: [historyStore, openRequestsStore, collectionsStore],
});
