import { useId, type FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

import { VaultPasswordChangeForm } from './VaultPasswordChangeForm.tsx';

interface VaultSettingsModalProps {
    /** Shows the dialog while true */
    isOpen: boolean;
    /** Called on every close, the password changed or not */
    onClose: VoidFunction;
    /** Moves on to turning the vault off */
    onDisable: VoidFunction;
}

export const VaultSettingsModal: FC<VaultSettingsModalProps> = ({ isOpen, onClose, onDisable }) => {
    const formId = useId();
    const { t } = useTranslation();

    return (
        <Modal
            footer={
                <>
                    <Button variant={ButtonVariants.GHOST} onClick={onDisable}>
                        {t('apiClientVaultDisableOpen')}
                    </Button>

                    <Button onClick={onClose}>{t('apiClientVaultCancel')}</Button>

                    <Button form={formId} type='submit' variant={ButtonVariants.PRIMARY}>
                        {t('apiClientVaultChangeSubmit')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            title={t('apiClientVaultSettingsTitle')}
            onClose={onClose}
        >
            <VaultPasswordChangeForm formId={formId} onDone={onClose} />
        </Modal>
    );
};
