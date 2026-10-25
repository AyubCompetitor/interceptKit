import { useState, type ChangeEvent, type SubmitEvent } from 'react';

import { getFolderChoices, type Collection } from '#entities/request';

import { findCollection } from './collectionTabs.ts';
import type { SaveTarget } from './useCollections.ts';

/** The choice of a collection that makes a new one */
export const NEW_COLLECTION_CHOICE = '';

/** The choice of a folder that puts the request at the top of the collection */
export const TOP_FOLDER_CHOICE = '';

export const useSaveRequestForm = (
    collections: readonly Collection[],
    defaultName: string,
    onSave: (target: SaveTarget) => void,
) => {
    const [name, setName] = useState(defaultName);
    const [collectionId, setCollectionId] = useState(collections[0]?.id ?? NEW_COLLECTION_CHOICE);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [folderId, setFolderId] = useState(TOP_FOLDER_CHOICE);

    const collection = findCollection(collections, collectionId);
    const folders = collection ? getFolderChoices(collection) : [];

    const onNameChange = (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value);

    const onCollectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setCollectionId(event.target.value);
        setFolderId(TOP_FOLDER_CHOICE);
    };

    const onNewCollectionNameChange = (event: ChangeEvent<HTMLInputElement>) =>
        setNewCollectionName(event.target.value);

    const onFolderChange = (event: ChangeEvent<HTMLSelectElement>) => setFolderId(event.target.value);

    const onSaveSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        onSave({
            name: name.trim(),
            newCollectionName: newCollectionName.trim(),
            ...(collection && { collection }),
            ...(folderId !== TOP_FOLDER_CHOICE && { folderId }),
        });
    };

    return {
        name,
        collectionId,
        newCollectionName,
        folderId,
        folders,
        isNewCollection: !collection,
        onNameChange,
        onCollectionChange,
        onNewCollectionNameChange,
        onFolderChange,
        onSaveSubmit,
    };
};
