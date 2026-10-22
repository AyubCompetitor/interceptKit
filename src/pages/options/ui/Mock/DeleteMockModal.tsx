import type { FC } from 'react';

import type { Mock } from '#entities/mock';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

interface DeleteMockModalProps {
    /** Mock waiting for confirmation; the dialog is closed while there is none */
    mock: NotRequired<Mock>;
    /** Keeps the mock */
    onCancel: VoidFunction;
    /** Deletes the mock */
    onConfirm: VoidFunction;
}

export const DeleteMockModal: FC<DeleteMockModalProps> = ({ mock, onCancel, onConfirm }) => {
    const { t } = useTranslation();

    const isOpen = mock !== undefined;

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onCancel}>{t('mocksCancel')}</Button>
                    <Button variant={ButtonVariants.DANGER} onClick={onConfirm}>
                        {t('mocksDelete')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            title={t('mocksDeleteTitle')}
            onClose={onCancel}
        >
            <p>{t('mocksDeleteText', mock?.name ?? '')}</p>
        </Modal>
    );
};
