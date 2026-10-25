import { useId, type FC } from 'react';

import type { SaveTarget } from '../../model/useCollections.ts';
import { NEW_COLLECTION_CHOICE, TOP_FOLDER_CHOICE, useSaveRequestForm } from '../../model/useSaveRequestForm.ts';

import { MAX_COLLECTIONS, type Collection } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Field, Modal, Typography, TypographyColors } from '#shared/ui';

import styles from './SaveRequestModal.module.css';

interface SaveRequestModalProps {
    /** Collections to save into */
    collections: readonly Collection[];
    /** Name the form starts with */
    defaultName: string;
    /** Whether there is room for one more collection */
    isLimitReached: boolean;
    /** Whether the last save failed */
    isSaveFailed: boolean;
    /** Saves the request of the tab there */
    onSave: (target: SaveTarget) => void;
    /** Called on every close */
    onClose: VoidFunction;
}

/** A folder sits under its parent: two spaces for each level of depth */
const FOLDER_INDENT = '  ';

const MAX_NAME_LENGTH = 200;

/** Mounted only while open, so it starts from the tab it was opened for */
export const SaveRequestModal: FC<SaveRequestModalProps> = ({
    collections,
    defaultName,
    isLimitReached,
    isSaveFailed,
    onSave,
    onClose,
}) => {
    const formId = useId();
    const { t } = useTranslation();
    const {
        name,
        collectionId,
        newCollectionName,
        folderId,
        folders,
        isNewCollection,
        onNameChange,
        onCollectionChange,
        onNewCollectionNameChange,
        onFolderChange,
        onSaveSubmit,
    } = useSaveRequestForm(collections, defaultName, onSave);

    const isSaveBlocked = isNewCollection && isLimitReached;

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onClose}>{t('apiClientCollectionCancel')}</Button>

                    <Button disabled={isSaveBlocked} form={formId} type='submit' variant={ButtonVariants.PRIMARY}>
                        {t('apiClientCollectionSave')}
                    </Button>
                </>
            }
            title={t('apiClientSaveTitle')}
            isOpen
            onClose={onClose}
        >
            <form className={styles.form} id={formId} onSubmit={onSaveSubmit}>
                <Field label={t('apiClientSaveName')}>
                    <input maxLength={MAX_NAME_LENGTH} value={name} required onChange={onNameChange} />
                </Field>

                <Field label={t('apiClientSaveCollection')}>
                    <select value={collectionId} onChange={onCollectionChange}>
                        {collections.map(collection => (
                            <option key={collection.id} value={collection.id}>
                                {collection.name}
                            </option>
                        ))}

                        <option disabled={isLimitReached} value={NEW_COLLECTION_CHOICE}>
                            {t('apiClientCollectionAdd')}
                        </option>
                    </select>
                </Field>

                {isNewCollection && (
                    <Field label={t('apiClientSaveCollectionName')}>
                        <input
                            maxLength={MAX_NAME_LENGTH}
                            value={newCollectionName}
                            required
                            onChange={onNewCollectionNameChange}
                        />
                    </Field>
                )}

                {!isNewCollection && (
                    <Field label={t('apiClientSaveFolder')}>
                        <select value={folderId} onChange={onFolderChange}>
                            <option value={TOP_FOLDER_CHOICE}>{t('apiClientSaveTop')}</option>

                            {folders.map(folder => (
                                <option key={folder.id} value={folder.id}>
                                    {FOLDER_INDENT.repeat(folder.depth - 1) + folder.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}

                {isSaveBlocked && (
                    <Typography color={TypographyColors.HINT}>
                        {t('apiClientCollectionsLimit', String(MAX_COLLECTIONS))}
                    </Typography>
                )}

                {isSaveFailed && (
                    <Typography color={TypographyColors.DANGER} role='alert'>
                        {t('apiClientSaveFailed')}
                    </Typography>
                )}
            </form>
        </Modal>
    );
};
