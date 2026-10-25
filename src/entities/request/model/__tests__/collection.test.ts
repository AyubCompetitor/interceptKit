import { describe, expect, it } from '@rstest/core';

import { HttpMethods, validate } from '#shared/lib';

import {
    addCollectionItem,
    CollectionItemTypes,
    collectionsValidator,
    collectionValidator,
    createRequestItem,
    findCollectionRequest,
    getFolderChoices,
    isSameRequest,
    MAX_COLLECTION_REQUESTS,
    MAX_FOLDER_DEPTH,
    removeCollectionItem,
    renameCollectionItem,
    replaceCollectionRequest,
    type Collection,
    type CollectionFolder,
    type CollectionItem,
} from '../collection.ts';
import { RequestBodyTypes, type ApiRequest } from '../request.ts';

const makeApiRequest = (id: string, overrides: Partial<ApiRequest> = {}): ApiRequest => ({
    id,
    method: HttpMethods.GET,
    url: 'https://api.example.com/users',
    query: [],
    headers: [],
    body: { bodyType: RequestBodyTypes.NONE },
    sendCookies: false,
    ...overrides,
});

const makeFolder = (id: string, items: readonly CollectionItem[] = []): CollectionFolder => ({
    itemType: CollectionItemTypes.FOLDER,
    id,
    name: `Folder ${id}`,
    items,
});

const makeCollection = (items: readonly CollectionItem[], id = 'c1'): Collection => ({
    id,
    name: 'Shop API',
    createdAt: 1,
    items,
});

const COLLECTION = makeCollection([
    createRequestItem(makeApiRequest('users', { name: 'Users' })),
    makeFolder('api', [makeFolder('orders', [createRequestItem(makeApiRequest('list'))])]),
]);

const nestFolders = (depth: number): CollectionItem[] => {
    let items: CollectionItem[] = [createRequestItem(makeApiRequest('deep'))];

    for (let level = depth; level > 0; level -= 1) {
        items = [makeFolder(`f${level}`, items)];
    }

    return items;
};

const isValid = (collection: Collection): boolean => validate(collectionValidator, collection).ok;

describe('collectionValidator', () => {
    it('accepts folders inside folders', () => {
        expect(isValid(COLLECTION)).toBe(true);
    });

    it('takes folders down to the deepest level and no further', () => {
        expect(isValid(makeCollection(nestFolders(MAX_FOLDER_DEPTH)))).toBe(true);

        expect(isValid(makeCollection(nestFolders(MAX_FOLDER_DEPTH + 1)))).toBe(false);
    });

    it('refuses two items with one id', () => {
        const items = [createRequestItem(makeApiRequest('same')), makeFolder('same')];

        expect(isValid(makeCollection(items))).toBe(false);
    });

    it('refuses more requests than a collection holds, counted through the folders', () => {
        const requests = Array.from({ length: MAX_COLLECTION_REQUESTS }, (_, idx) =>
            createRequestItem(makeApiRequest(`r${idx}`)),
        );
        const items = [makeFolder('half', requests.slice(0, 1000)), ...requests.slice(1000)];

        expect(isValid(makeCollection(items))).toBe(true);

        expect(isValid(makeCollection([...items, createRequestItem(makeApiRequest('extra'))]))).toBe(false);
    });
});

describe('collectionsValidator', () => {
    it('refuses two collections with one id', () => {
        expect(validate(collectionsValidator, [COLLECTION, COLLECTION]).ok).toBe(false);
    });
});

describe('tree operations', () => {
    it('adds an item at the end of the collection or of a folder', () => {
        const atTop = addCollectionItem(COLLECTION, undefined, makeFolder('new'));
        const inFolder = addCollectionItem(COLLECTION, 'orders', createRequestItem(makeApiRequest('create')));

        expect(atTop.items.at(-1)).toMatchObject({ id: 'new' });

        expect(findCollectionRequest(inFolder, 'create')).toMatchObject({ id: 'create' });
    });

    it('renames a folder and a request', () => {
        const renamed = renameCollectionItem(renameCollectionItem(COLLECTION, 'api', 'Backend'), 'list', 'All orders');

        expect(getFolderChoices(renamed)[0]).toMatchObject({ name: 'Backend' });

        expect(findCollectionRequest(renamed, 'list')?.name).toBe('All orders');
    });

    it('removes a folder with everything inside it', () => {
        const removed = removeCollectionItem(COLLECTION, 'api');

        expect(removed.items).toHaveLength(1);

        expect(findCollectionRequest(removed, 'list')).toBeUndefined();
    });

    it('replaces a request in place and keeps its name', () => {
        const changed = makeApiRequest('users', { method: HttpMethods.POST });

        expect(findCollectionRequest(replaceCollectionRequest(COLLECTION, changed), 'users')).toEqual({
            ...changed,
            name: 'Users',
        });
    });

    it('lists the folders in the order of the tree with their depth', () => {
        expect(getFolderChoices(COLLECTION)).toEqual([
            { id: 'api', name: 'Folder api', depth: 1 },
            { id: 'orders', name: 'Folder orders', depth: 2 },
        ]);
    });
});

describe('isSameRequest', () => {
    it('ignores the id and the name', () => {
        expect(isSameRequest(makeApiRequest('a', { name: 'A' }), makeApiRequest('b'))).toBe(true);
    });

    it('notices a change of what is sent', () => {
        expect(isSameRequest(makeApiRequest('a'), makeApiRequest('a', { url: 'https://api.example.com/orders' }))).toBe(
            false,
        );
    });
});
