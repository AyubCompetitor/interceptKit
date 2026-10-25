import {
    findCollectionRequest,
    isSameRequest,
    type ApiRequest,
    type Collection,
    type CollectionLink,
} from '#entities/request';

import { buildApiRequest } from './requestDraft.ts';
import type { RequestTab } from './requestTabs.ts';

export const findCollection = (collections: readonly Collection[], collectionId: string): NotRequired<Collection> =>
    collections.find(collection => collection.id === collectionId);

export const findLinkedRequest = (
    collections: readonly Collection[],
    link: NotRequired<CollectionLink>,
): NotRequired<ApiRequest> => {
    const collection = link && findCollection(collections, link.collectionId);

    if (!link || !collection) {
        return;
    }

    return findCollectionRequest(collection, link.requestId);
};

export const buildSavedRequest = (tab: RequestTab, requestId: string): ApiRequest => ({
    ...buildApiRequest(tab.draft),
    id: requestId,
});

export const getLinkedTabNames = (
    tabs: readonly RequestTab[],
    collections: readonly Collection[],
): Map<string, string> => {
    const names = new Map<string, string>();

    for (const tab of tabs) {
        const name = findLinkedRequest(collections, tab.link)?.name;

        if (name) {
            names.set(tab.draft.id, name);
        }
    }

    return names;
};

export const isTabUnsaved = (tab: RequestTab, collections: readonly Collection[]): boolean => {
    const savedRequest = findLinkedRequest(collections, tab.link);

    if (!savedRequest) {
        return false;
    }

    return !isSameRequest(buildApiRequest(tab.draft), savedRequest);
};
