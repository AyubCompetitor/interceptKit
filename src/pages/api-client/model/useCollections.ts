import {
    addCollectionItem,
    apiClientDatabase,
    collectionsStore,
    createCollection,
    createFolder,
    createRequestItem,
    MAX_COLLECTIONS,
    removeCollectionItem,
    renameCollectionItem,
    replaceCollectionRequest,
    type ApiRequest,
    type Collection,
    type CollectionLink,
} from '#entities/request';
import { getRandomUUID } from '#shared/lib';
import { deleteRecord, useDatabaseRecords, writeRecord } from '#shared/platform';
import { useProcessAction } from '#shared/ui';

import { buildApiRequest, createRequestDraft } from './requestDraft.ts';

/** Where a request is saved for the first time */
export interface SaveTarget {
    /** Name of the request in the tree */
    readonly name: string;
    /** The collection to save into; none makes a new one */
    readonly collection?: Collection;
    /** Name of the new collection when there is none to save into */
    readonly newCollectionName: string;
    /** The folder to save into; none puts the request at the top of the collection */
    readonly folderId?: string;
}

const byCreation = (first: Collection, second: Collection): number => first.createdAt - second.createdAt;

const writeCollection = (collection: Collection): Promise<void> =>
    writeRecord(apiClientDatabase, collectionsStore, collection);

export const useCollections = () => {
    const records = useDatabaseRecords(apiClientDatabase, collectionsStore);
    const { isFailed: isActionFailed, processAction } = useProcessAction();

    const collections = (records ?? []).toSorted(byCreation);
    const isLoading = !records;
    const isLimitReached = collections.length >= MAX_COLLECTIONS;

    const onCollectionCreate = (name: string) => processAction(writeCollection(createCollection(name, Date.now())));

    const onCollectionRename = (collection: Collection, name: string) =>
        processAction(writeCollection({ ...collection, name }));

    const onCollectionDelete = (collection: Collection) =>
        processAction(deleteRecord(apiClientDatabase, collectionsStore, collection.id));

    const onFolderAdd = (collection: Collection, folderId: NotRequired<string>, name: string) =>
        processAction(writeCollection(addCollectionItem(collection, folderId, createFolder(name))));

    const onItemRename = (collection: Collection, itemId: string, name: string) =>
        processAction(writeCollection(renameCollectionItem(collection, itemId, name)));

    const onItemDelete = (collection: Collection, itemId: string) =>
        processAction(writeCollection(removeCollectionItem(collection, itemId)));

    /** A new empty request goes into the folder, and the caller opens it once it is stored */
    const onRequestAdd = (
        collection: Collection,
        folderId: NotRequired<string>,
        name: string,
        onAdded: (link: CollectionLink, request: ApiRequest) => void,
    ) => {
        const request = { ...buildApiRequest(createRequestDraft()), name };
        const link = { collectionId: collection.id, requestId: request.id };
        const nextCollection = addCollectionItem(collection, folderId, createRequestItem(request));

        processAction(writeCollection(nextCollection).then(() => onAdded(link, request)));
    };

    const onRequestSave = (collection: Collection, request: ApiRequest) =>
        processAction(writeCollection(replaceCollectionRequest(collection, request)));

    /** The request gets an id of its own in the collection, and the caller links its tab once it is stored */
    const onRequestSaveAs = (target: SaveTarget, request: ApiRequest, onSaved: (link: CollectionLink) => void) => {
        const collection = target.collection ?? createCollection(target.newCollectionName, Date.now());
        const savedRequest = { ...request, id: getRandomUUID(), name: target.name };
        const link = { collectionId: collection.id, requestId: savedRequest.id };
        const nextCollection = addCollectionItem(collection, target.folderId, createRequestItem(savedRequest));

        processAction(writeCollection(nextCollection).then(() => onSaved(link)));
    };

    return {
        collections,
        isLoading,
        isLimitReached,
        isActionFailed,
        onCollectionCreate,
        onCollectionRename,
        onCollectionDelete,
        onFolderAdd,
        onItemRename,
        onItemDelete,
        onRequestAdd,
        onRequestSave,
        onRequestSaveAs,
    };
};
