import {
    array,
    discriminatedUnion,
    displayName,
    getRandomUUID,
    identifier,
    isDuplicateValues,
    literal,
    number,
    object,
    refine,
    validate,
    type Validator,
} from '#shared/lib';

import { apiRequestValidator, type ApiRequest } from './request.ts';

export enum CollectionItemTypes {
    FOLDER = 'folder',
    REQUEST = 'request',
}

export type CollectionItemType = `${CollectionItemTypes}`;

/** A folder of requests and other folders */
export interface CollectionFolder {
    /** Kind of the item */
    readonly itemType: CollectionItemTypes.FOLDER;
    /** Unique within the collection */
    readonly id: string;
    /** Name shown in the tree */
    readonly name: string;
    /** Folders and requests inside, in their order */
    readonly items: readonly CollectionItem[];
}

/** A request kept in a collection */
export interface CollectionRequest {
    /** Kind of the item */
    readonly itemType: CollectionItemTypes.REQUEST;
    /** The request; its id is unique within the collection, its name shows in the tree */
    readonly request: ApiRequest;
}

export type CollectionItem = CollectionFolder | CollectionRequest;

/** Requests the user keeps, in folders */
export interface Collection {
    /** Unique among the collections */
    readonly id: string;
    /** Name shown in the sidebar */
    readonly name: string;
    /** When the collection was made, in milliseconds since the epoch: collections are listed in this order */
    readonly createdAt: number;
    /** Folders and requests at the top, in their order */
    readonly items: readonly CollectionItem[];
}

/** Where the request of a tab is kept */
export interface CollectionLink {
    /** Id of the collection */
    readonly collectionId: string;
    /** Id of the request in it */
    readonly requestId: string;
}

/** A folder a request can be saved into, with how deep it sits */
export interface FolderChoice {
    /** Id of the folder */
    readonly id: string;
    /** Name of the folder */
    readonly name: string;
    /** 1 for a folder at the top of the collection */
    readonly depth: number;
}

/** How much a collection holds */
export interface CollectionCounts {
    /** Folders at every depth */
    readonly folders: number;
    /** Requests at every depth */
    readonly requests: number;
}

/** Removes the item when it gives nothing back */
type ItemUpdate = (item: CollectionItem) => NotRequired<CollectionItem>;

export const MAX_COLLECTIONS = 100;

export const MAX_COLLECTION_REQUESTS = 2000;

export const MAX_FOLDER_DEPTH = 5;

const COLLECTION_ERRORS = {
    TOO_MANY_REQUESTS: `a collection holds at most ${MAX_COLLECTION_REQUESTS} requests`,
    DUPLICATE_ID: 'two items of the collection share an id',
    DUPLICATE_COLLECTION: 'two collections share an id',
} as const;

const collectionRequest = object({
    itemType: literal(CollectionItemTypes.REQUEST),
    request: apiRequestValidator,
});

const buildItemValidator = (depth: number): Validator<CollectionItem> => {
    if (depth > MAX_FOLDER_DEPTH) {
        return collectionRequest;
    }

    const folder = object({
        itemType: literal(CollectionItemTypes.FOLDER),
        id: identifier,
        name: displayName,
        items: array(buildItemValidator(depth + 1), { maxLength: MAX_COLLECTION_REQUESTS }),
    });

    return discriminatedUnion('itemType', {
        [CollectionItemTypes.FOLDER]: folder,
        [CollectionItemTypes.REQUEST]: collectionRequest,
    });
};

export const isFolderItem = (item: CollectionItem): item is CollectionFolder =>
    item.itemType === CollectionItemTypes.FOLDER;

const isRequestItem = (item: CollectionItem): item is CollectionRequest =>
    item.itemType === CollectionItemTypes.REQUEST;

export const getItemId = (item: CollectionItem): string => (isFolderItem(item) ? item.id : item.request.id);

const collectItems = (items: readonly CollectionItem[], into: CollectionItem[]): CollectionItem[] => {
    for (const item of items) {
        into.push(item);

        if (isFolderItem(item)) {
            collectItems(item.items, into);
        }
    }

    return into;
};

export const flattenCollectionItems = (collection: Pick<Collection, 'items'>): CollectionItem[] =>
    collectItems(collection.items, []);

export const countCollectionItems = (collection: Pick<Collection, 'items'>): CollectionCounts => {
    let folders = 0;
    let requests = 0;

    for (const item of flattenCollectionItems(collection)) {
        if (isFolderItem(item)) {
            folders += 1;
            continue;
        }

        requests += 1;
    }

    return {
        folders,
        requests,
    };
};

const getCollectionError = (collection: Collection): NotRequired<string> => {
    const items = flattenCollectionItems(collection);

    if (items.filter(isRequestItem).length > MAX_COLLECTION_REQUESTS) {
        return COLLECTION_ERRORS.TOO_MANY_REQUESTS;
    }

    if (!isDuplicateValues(items.map(getItemId))) {
        return;
    }

    return COLLECTION_ERRORS.DUPLICATE_ID;
};

const collectionShape = object({
    id: identifier,
    name: displayName,
    createdAt: number({ integer: true, min: 0 }),
    items: array(buildItemValidator(1), { maxLength: MAX_COLLECTION_REQUESTS }),
});

export const collectionValidator: Validator<Collection> = refine(collectionShape, getCollectionError);

const getDuplicateCollectionError = (collections: readonly Collection[]): NotRequired<string> => {
    if (!isDuplicateValues(collections.map(collection => collection.id))) {
        return;
    }

    return COLLECTION_ERRORS.DUPLICATE_COLLECTION;
};

export const collectionsValidator: Validator<Collection[]> = refine(
    array(collectionValidator, { maxLength: MAX_COLLECTIONS }),
    getDuplicateCollectionError,
);

export const createCollection = (name: string, createdAt: number): Collection => ({
    id: getRandomUUID(),
    name,
    createdAt,
    items: [],
});

export const createFolder = (name: string): CollectionFolder => ({
    itemType: CollectionItemTypes.FOLDER,
    id: getRandomUUID(),
    name,
    items: [],
});

export const createRequestItem = (request: ApiRequest): CollectionRequest => ({
    itemType: CollectionItemTypes.REQUEST,
    request,
});

const updateItems = (items: readonly CollectionItem[], itemId: string, update: ItemUpdate): CollectionItem[] => {
    const nextItems: CollectionItem[] = [];

    for (const item of items) {
        if (getItemId(item) === itemId) {
            const updated = update(item);

            if (updated) {
                nextItems.push(updated);
            }

            continue;
        }

        if (isFolderItem(item)) {
            nextItems.push({
                ...item,
                items: updateItems(item.items, itemId, update),
            });

            continue;
        }

        nextItems.push(item);
    }

    return nextItems;
};

const updateCollection = (collection: Collection, itemId: string, update: ItemUpdate): Collection => ({
    ...collection,
    items: updateItems(collection.items, itemId, update),
});

export const addCollectionItem = (
    collection: Collection,
    folderId: NotRequired<string>,
    newItem: CollectionItem,
): Collection => {
    if (folderId === undefined) {
        return {
            ...collection,
            items: [...collection.items, newItem],
        };
    }

    return updateCollection(collection, folderId, item => {
        if (!isFolderItem(item)) {
            return item;
        }

        return {
            ...item,
            items: [...item.items, newItem],
        };
    });
};

export const renameCollectionItem = (collection: Collection, itemId: string, name: string): Collection =>
    updateCollection(collection, itemId, item => {
        if (isFolderItem(item)) {
            return {
                ...item,
                name,
            };
        }

        return {
            ...item,
            request: { ...item.request, name },
        };
    });

/** A folder goes with everything inside it */
export const removeCollectionItem = (collection: Collection, itemId: string): Collection =>
    updateCollection(collection, itemId, () => undefined);

/** The request takes the place of the one with its id and keeps that one's name */
export const replaceCollectionRequest = (collection: Collection, request: ApiRequest): Collection =>
    updateCollection(collection, request.id, item => {
        if (isFolderItem(item)) {
            return item;
        }

        const { name } = item.request;

        return createRequestItem({
            ...request,
            ...(name !== undefined && { name }),
        });
    });

export const findCollectionRequest = (collection: Collection, requestId: string): NotRequired<ApiRequest> => {
    const item = flattenCollectionItems(collection).find(current => getItemId(current) === requestId);

    if (!item || isFolderItem(item)) {
        return;
    }

    return item.request;
};

const collectFolders = (items: readonly CollectionItem[], depth: number, into: FolderChoice[]): FolderChoice[] => {
    for (const item of items) {
        if (!isFolderItem(item)) {
            continue;
        }

        into.push({ id: item.id, name: item.name, depth });

        collectFolders(item.items, depth + 1, into);
    }

    return into;
};

export const getFolderChoices = (collection: Collection): FolderChoice[] => collectFolders(collection.items, 1, []);

const toComparable = (request: ApiRequest): string => {
    const result = validate(apiRequestValidator, { ...request, id: 'compared', name: undefined });

    return JSON.stringify(result.ok ? result.value : request);
};

export const isSameRequest = (first: ApiRequest, second: ApiRequest): boolean =>
    toComparable(first) === toComparable(second);
