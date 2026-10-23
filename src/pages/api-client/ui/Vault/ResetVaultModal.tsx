import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

interface ResetVaultModalProps {
    /** Shows the dialog while true */
    isOpen: boolean;
    /** Keeps the vault as it is */
    onCancel: VoidFunction;
    /** Deletes the encrypted values and turns the vault off */
    onConfirm: VoidFunction;
}

export const ResetVaultModal: FC<ResetVaultModalProps> = ({ isOpen, onCancel, onConfirm }) => {
    const { t } = useTranslation();

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onCancel}>{t('apiClientVaultCancel')}</Button>

                    <Button variant={ButtonVariants.DANGER} onClick={onConfirm}>
                        {t('apiClientVaultResetSubmit')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            title={t('apiClientVaultResetTitle')}
            onClose={onCancel}
        >
            <p>{t('apiClientVaultResetText')}</p>
        </Modal>
    );
};
