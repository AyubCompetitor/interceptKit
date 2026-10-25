import { useCollapsedItems } from '../lib/useCollapsedItems.ts';
import { CollectionDialogTypes, useCollectionDialog, type CollectionDialogType } from '../lib/useCollectionDialog.ts';

import type { ApiRequest, Collection, CollectionLink } from '#entities/request';

import { useCollections } from './useCollections.ts';

/** What a row of the tree can start */
export interface CollectionTreeActions {
    /** Opens or closes a collection or a folder */
    readonly onItemToggle: (itemId: string) => void;
    /** Opens the request in a tab, or shows its tab */
    readonly onRequestOpen: (collection: Collection, request: ApiRequest) => void;
    /** Asks for the name of a new folder in the collection or in the folder */
    readonly onFolderAddOpen: (collection: Collection, folderId?: string) => void;
    /** Asks for the name of a new request in the collection or in the folder */
    readonly onRequestAddOpen: (collection: Collection, folderId?: string) => void;
    /** Asks for a new name of the collection, or of its item */
    readonly onRenameOpen: (collection: Collection, name: string, itemId?: string) => void;
    /** Asks before deleting the collection, or its item */
    readonly onDeleteOpen: (collection: Collection, name: string, itemId?: string) => void;
}

/** What the name of a dialog does: the collection and the item come from the dialog */
type NameSubmit = (name: string, collection: NotRequired<Collection>, itemId: NotRequired<string>) => void;

export const useCollectionPanel = (onRequestOpen: (link: CollectionLink, request: ApiRequest) => void) => {
    const { collapsedIds, onItemToggle } = useCollapsedItems();
    const { dialog, onCreateOpen, onFolderAddOpen, onRequestAddOpen, onRenameOpen, onDeleteOpen, onDialogClose } =
        useCollectionDialog();
    const {
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
    } = useCollections();

    const openCollectionRequest = (collection: Collection, request: ApiRequest) =>
        onRequestOpen({ collectionId: collection.id, requestId: request.id }, request);

    const renameItem: NameSubmit = (name, collection, itemId) => {
        if (!collection) {
            return;
        }

        if (itemId === undefined) {
            onCollectionRename(collection, name);

            return;
        }

        onItemRename(collection, itemId, name);
    };

    const NAME_SUBMITS: Record<CollectionDialogType, NameSubmit> = {
        [CollectionDialogTypes.CREATE]: name => onCollectionCreate(name),
        [CollectionDialogTypes.ADD_FOLDER]: (name, collection, itemId) => {
            if (collection) {
                onFolderAdd(collection, itemId, name);
            }
        },
        [CollectionDialogTypes.ADD_REQUEST]: (name, collection, itemId) => {
            if (collection) {
                onRequestAdd(collection, itemId, name, onRequestOpen);
            }
        },
        [CollectionDialogTypes.RENAME]: renameItem,
        [CollectionDialogTypes.DELETE]: () => undefined,
    };

    const onNameSubmit = (name: string) => {
        if (!dialog) {
            return;
        }

        NAME_SUBMITS[dialog.dialogType](name.trim(), dialog.collection, dialog.itemId);
        onDialogClose();
    };

    const onDeleteConfirm = () => {
        const collection = dialog?.collection;
        const itemId = dialog?.itemId;

        onDialogClose();

        if (!collection) {
            return;
        }

        if (itemId === undefined) {
            onCollectionDelete(collection);

            return;
        }

        onItemDelete(collection, itemId);
    };

    const treeActions: CollectionTreeActions = {
        onItemToggle,
        onRequestOpen: openCollectionRequest,
        onFolderAddOpen,
        onRequestAddOpen,
        onRenameOpen,
        onDeleteOpen,
    };

    return {
        collections,
        collapsedIds,
        dialog,
        treeActions,
        isLoading,
        isLimitReached,
        isActionFailed,
        onCreateOpen,
        onNameSubmit,
        onDeleteConfirm,
        onDialogClose,
    };
};
