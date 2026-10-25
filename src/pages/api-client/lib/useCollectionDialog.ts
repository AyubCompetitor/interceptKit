import { useState } from 'react';

import type { Collection } from '#entities/request';

export enum CollectionDialogTypes {
    CREATE = 'create',
    ADD_FOLDER = 'addFolder',
    ADD_REQUEST = 'addRequest',
    RENAME = 'rename',
    DELETE = 'delete',
}

export type CollectionDialogType = `${CollectionDialogTypes}`;

/** An open dialog of the collections and what it acts on */
export interface CollectionDialog {
    /** What the dialog does */
    readonly dialogType: CollectionDialogType;
    /** The collection it acts on; none for a new collection */
    readonly collection?: Collection;
    /** The folder or request it acts on, or the folder that gets a new item; none for the collection itself */
    readonly itemId?: string;
    /** The current name, for renaming and for the question before deleting */
    readonly name: string;
}

export const useCollectionDialog = () => {
    const [dialog, setDialog] = useState<CollectionDialog>();

    const onCreateOpen = () => setDialog({ dialogType: CollectionDialogTypes.CREATE, name: '' });

    const onFolderAddOpen = (collection: Collection, folderId?: string) =>
        setDialog({
            dialogType: CollectionDialogTypes.ADD_FOLDER,
            collection,
            name: '',
            ...(folderId !== undefined && { itemId: folderId }),
        });

    const onRequestAddOpen = (collection: Collection, folderId?: string) =>
        setDialog({
            dialogType: CollectionDialogTypes.ADD_REQUEST,
            collection,
            name: '',
            ...(folderId !== undefined && { itemId: folderId }),
        });

    const onRenameOpen = (collection: Collection, name: string, itemId?: string) =>
        setDialog({
            dialogType: CollectionDialogTypes.RENAME,
            collection,
            name,
            ...(itemId !== undefined && { itemId }),
        });

    const onDeleteOpen = (collection: Collection, name: string, itemId?: string) =>
        setDialog({
            dialogType: CollectionDialogTypes.DELETE,
            collection,
            name,
            ...(itemId !== undefined && { itemId }),
        });

    const onDialogClose = () => setDialog(undefined);

    return {
        dialog,
        onCreateOpen,
        onFolderAddOpen,
        onRequestAddOpen,
        onRenameOpen,
        onDeleteOpen,
        onDialogClose,
    };
};
