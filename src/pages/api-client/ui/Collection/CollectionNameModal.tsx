import { useId, useState, type ChangeEvent, type FC, type SubmitEvent } from 'react';

import {
    CollectionDialogTypes,
    type CollectionDialog,
    type CollectionDialogType,
} from '../../lib/useCollectionDialog.ts';

import { useTranslation, type MessageKey } from '#shared/i18n';
import { Button, ButtonVariants, Field, Modal } from '#shared/ui';

interface CollectionNameModalProps {
    /** The dialog that asks for a name */
    dialog: CollectionDialog;
    /** Called with the typed name */
    onSubmit: (name: string) => void;
    /** Called on every close */
    onClose: VoidFunction;
}

const DIALOG_TITLES: Record<CollectionDialogType, MessageKey> = {
    [CollectionDialogTypes.CREATE]: 'apiClientCollectionCreateTitle',
    [CollectionDialogTypes.ADD_FOLDER]: 'apiClientCollectionFolderTitle',
    [CollectionDialogTypes.ADD_REQUEST]: 'apiClientCollectionRequestTitle',
    [CollectionDialogTypes.RENAME]: 'apiClientCollectionRenameTitle',
    [CollectionDialogTypes.DELETE]: 'apiClientCollectionRenameTitle',
};

const MAX_NAME_LENGTH = 200;

/** Mounted only while open, so it starts from the current name every time */
export const CollectionNameModal: FC<CollectionNameModalProps> = ({ dialog, onSubmit, onClose }) => {
    const [name, setName] = useState(dialog.name);

    const formId = useId();
    const { t } = useTranslation();

    const onNameChange = (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value);

    const onFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit(name);
    };

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onClose}>{t('apiClientCollectionCancel')}</Button>

                    <Button form={formId} type='submit' variant={ButtonVariants.PRIMARY}>
                        {t(
                            dialog.dialogType === CollectionDialogTypes.RENAME
                                ? 'apiClientCollectionSave'
                                : 'apiClientCollectionCreate',
                        )}
                    </Button>
                </>
            }
            title={t(DIALOG_TITLES[dialog.dialogType])}
            isOpen
            onClose={onClose}
        >
            <form id={formId} onSubmit={onFormSubmit}>
                <Field label={t('apiClientCollectionName')}>
                    <input maxLength={MAX_NAME_LENGTH} value={name} required onChange={onNameChange} />
                </Field>
            </form>
        </Modal>
    );
};
