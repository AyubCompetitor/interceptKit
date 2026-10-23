import { useId, type FC } from 'react';

import { vaultRpc } from '#entities/environment';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

import { VaultPasswordForm } from './VaultPasswordForm.tsx';

interface VaultUnlockModalProps {
    /** Shows the dialog while true */
    isOpen: boolean;
    /** Called on every close, unlocked or not */
    onClose: VoidFunction;
    /** Moves on to resetting the vault, for a forgotten password */
    onReset: VoidFunction;
}

export const VaultUnlockModal: FC<VaultUnlockModalProps> = ({ isOpen, onClose, onReset }) => {
    const formId = useId();
    const { t } = useTranslation();

    return (
        <Modal
            footer={
                <>
                    <Button variant={ButtonVariants.GHOST} onClick={onReset}>
                        {t('apiClientVaultForgot')}
                    </Button>

                    <Button onClick={onClose}>{t('apiClientVaultCancel')}</Button>

                    <Button form={formId} type='submit' variant={ButtonVariants.PRIMARY}>
                        {t('apiClientVaultUnlockSubmit')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            title={t('apiClientVaultUnlockTitle')}
            onClose={onClose}
        >
            <VaultPasswordForm
                formId={formId}
                method={vaultRpc.unlock}
                text={t('apiClientVaultUnlockText')}
                onDone={onClose}
            />
        </Modal>
    );
};
