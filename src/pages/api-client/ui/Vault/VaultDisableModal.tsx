import { useId, type FC } from 'react';

import { vaultRpc } from '#entities/environment';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

import { VaultPasswordForm } from './VaultPasswordForm.tsx';

interface VaultDisableModalProps {
    /** Shows the dialog while true */
    isOpen: boolean;
    /** Called on every close, the vault turned off or not */
    onClose: VoidFunction;
}

export const VaultDisableModal: FC<VaultDisableModalProps> = ({ isOpen, onClose }) => {
    const formId = useId();
    const { t } = useTranslation();

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onClose}>{t('apiClientVaultCancel')}</Button>

                    <Button form={formId} type='submit' variant={ButtonVariants.DANGER}>
                        {t('apiClientVaultDisableSubmit')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            title={t('apiClientVaultDisableTitle')}
            onClose={onClose}
        >
            <VaultPasswordForm
                formId={formId}
                method={vaultRpc.disable}
                text={t('apiClientVaultDisableText')}
                onDone={onClose}
            />
        </Modal>
    );
};
