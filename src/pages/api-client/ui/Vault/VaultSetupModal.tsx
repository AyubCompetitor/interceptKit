import { useId, type FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

import { VaultSetupForm } from './VaultSetupForm.tsx';

interface VaultSetupModalProps {
    /** Shows the dialog while true */
    isOpen: boolean;
    /** Called on every close, the vault turned on or not */
    onClose: VoidFunction;
}

export const VaultSetupModal: FC<VaultSetupModalProps> = ({ isOpen, onClose }) => {
    const formId = useId();
    const { t } = useTranslation();

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onClose}>{t('apiClientVaultCancel')}</Button>

                    <Button form={formId} type='submit' variant={ButtonVariants.PRIMARY}>
                        {t('apiClientVaultSetupSubmit')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            title={t('apiClientVaultSetupTitle')}
            onClose={onClose}
        >
            <VaultSetupForm formId={formId} onDone={onClose} />
        </Modal>
    );
};
