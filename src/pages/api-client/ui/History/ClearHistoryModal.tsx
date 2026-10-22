import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

interface ClearHistoryModalProps {
    /** Shows the dialog while true */
    isOpen: boolean;
    /** Keeps the history */
    onCancel: VoidFunction;
    /** Deletes every entry */
    onConfirm: VoidFunction;
}

export const ClearHistoryModal: FC<ClearHistoryModalProps> = ({ isOpen, onCancel, onConfirm }) => {
    const { t } = useTranslation();

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onCancel}>{t('apiClientHistoryCancel')}</Button>
                    <Button variant={ButtonVariants.DANGER} onClick={onConfirm}>
                        {t('apiClientHistoryClear')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            title={t('apiClientHistoryClearTitle')}
            onClose={onCancel}
        >
            <p>{t('apiClientHistoryClearText')}</p>
        </Modal>
    );
};
