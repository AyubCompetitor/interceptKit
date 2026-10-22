import { useId, type FC } from 'react';

import type { Environment } from '#entities/environment';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal, ModalSizes } from '#shared/ui';

import { EnvironmentForm } from './EnvironmentForm.tsx';

interface EnvironmentEditorProps {
    /** Shows the editor while true */
    isOpen: boolean;
    /** Environment to edit, or undefined for a new one */
    environment: NotRequired<Environment>;
    /** Called on every close, saved or not */
    onClose: VoidFunction;
}

export const EnvironmentEditor: FC<EnvironmentEditorProps> = ({ isOpen, environment, onClose }) => {
    const formId = useId();

    const { t } = useTranslation();

    const isNewEnvironment = environment === undefined;
    const title = isNewEnvironment ? t('apiClientEnvironmentNewTitle') : t('apiClientEnvironmentEditTitle');

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onClose}>{t('apiClientEnvironmentCancel')}</Button>
                    <Button form={formId} type='submit' variant={ButtonVariants.PRIMARY}>
                        {t('apiClientEnvironmentSave')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            size={ModalSizes.LARGE}
            title={title}
            onClose={onClose}
        >
            <EnvironmentForm environment={environment} formId={formId} onSaved={onClose} />
        </Modal>
    );
};
