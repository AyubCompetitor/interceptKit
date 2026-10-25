import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

interface DeleteCollectionItemModalProps {
    /** Name of what waits for confirmation; the dialog is closed while there is none */
    name: NotRequired<string>;
    /** Keeps it */
    onCancel: VoidFunction;
    /** Deletes it */
    onConfirm: VoidFunction;
}

export const DeleteCollectionItemModal: FC<DeleteCollectionItemModalProps> = ({ name, onCancel, onConfirm }) => {
    const { t } = useTranslation();

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onCancel}>{t('apiClientCollectionCancel')}</Button>
                    <Button variant={ButtonVariants.DANGER} onClick={onConfirm}>
                        {t('apiClientCollectionDelete')}
                    </Button>
                </>
            }
            isOpen={name !== undefined}
            title={t('apiClientCollectionDeleteTitle')}
            onClose={onCancel}
        >
            <p>{t('apiClientCollectionDeleteText', name ?? '')}</p>
        </Modal>
    );
};
