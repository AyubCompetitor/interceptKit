import type { FC } from 'react';

import type { Rule } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal } from '#shared/ui';

interface DeleteRuleModalProps {
    /** Rule waiting for confirmation; the dialog is closed while there is none */
    rule: NotRequired<Rule>;
    /** Keeps the rule */
    onCancel: VoidFunction;
    /** Deletes the rule */
    onConfirm: VoidFunction;
}

export const DeleteRuleModal: FC<DeleteRuleModalProps> = ({ rule, onCancel, onConfirm }) => {
    const { t } = useTranslation();

    const isOpen = rule !== undefined;

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onCancel}>{t('rulesCancel')}</Button>
                    <Button variant={ButtonVariants.DANGER} onClick={onConfirm}>
                        {t('rulesDelete')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            title={t('rulesDeleteTitle')}
            onClose={onCancel}
        >
            <p>{t('rulesDeleteText', rule?.name ?? '')}</p>
        </Modal>
    );
};
