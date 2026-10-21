import { useId, type FC } from 'react';

import type { Rule } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal, ModalSizes } from '#shared/ui';

import { RuleForm } from './RuleForm.tsx';

interface RuleEditorProps {
    /** Shows the editor while true */
    isOpen: boolean;
    /** Rule to edit, or undefined for a new one */
    rule: NotRequired<Rule>;
    /** Called on every close, saved or not */
    onClose: VoidFunction;
}

export const RuleEditor: FC<RuleEditorProps> = ({ isOpen, rule, onClose }) => {
    const formId = useId();

    const { t } = useTranslation();

    const isNewRule = rule === undefined;
    const title = isNewRule ? t('rulesNewTitle') : t('rulesEditTitle');

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onClose}>{t('rulesCancel')}</Button>
                    <Button form={formId} type='submit' variant={ButtonVariants.PRIMARY}>
                        {t('rulesSave')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            size={ModalSizes.LARGE}
            title={title}
            onClose={onClose}
        >
            <RuleForm formId={formId} rule={rule} onSaved={onClose} />
        </Modal>
    );
};
