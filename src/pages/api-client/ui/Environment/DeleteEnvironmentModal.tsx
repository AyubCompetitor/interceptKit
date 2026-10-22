import type { FC } from 'react';

import type { Environment } from '#entities/environment';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

interface DeleteEnvironmentModalProps {
    /** Environment waiting for confirmation; the dialog is closed while there is none */
    environment: NotRequired<Environment>;
    /** Keeps the environment */
    onCancel: VoidFunction;
    /** Deletes the environment */
    onConfirm: VoidFunction;
}

export const DeleteEnvironmentModal: FC<DeleteEnvironmentModalProps> = ({ environment, onCancel, onConfirm }) => {
    const { t } = useTranslation();

    const isOpen = environment !== undefined;

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onCancel}>{t('apiClientEnvironmentCancel')}</Button>
                    <Button variant={ButtonVariants.DANGER} onClick={onConfirm}>
                        {t('apiClientEnvironmentDelete')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            title={t('apiClientEnvironmentDeleteTitle')}
            onClose={onCancel}
        >
            <p>{t('apiClientEnvironmentDeleteText', environment?.name ?? '')}</p>
        </Modal>
    );
};
