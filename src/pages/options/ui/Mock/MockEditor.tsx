import { useId, type FC } from 'react';

import type { Mock } from '#entities/mock';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Modal, ModalSizes } from '#shared/ui';

import { MockForm } from './MockForm.tsx';

interface MockEditorProps {
    /** Shows the editor while true */
    isOpen: boolean;
    /** Mock to edit, or undefined for a new one */
    mock: NotRequired<Mock>;
    /** Called on every close, saved or not */
    onClose: VoidFunction;
}

export const MockEditor: FC<MockEditorProps> = ({ isOpen, mock, onClose }) => {
    const formId = useId();
    const { t } = useTranslation();

    const isNewMock = mock === undefined;
    const title = isNewMock ? t('mocksNewTitle') : t('mocksEditTitle');

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onClose}>{t('mocksCancel')}</Button>
                    <Button form={formId} type='submit' variant={ButtonVariants.PRIMARY}>
                        {t('mocksSave')}
                    </Button>
                </>
            }
            isOpen={isOpen}
            size={ModalSizes.LARGE}
            title={title}
            onClose={onClose}
        >
            <MockForm formId={formId} mock={mock} onSaved={onClose} />
        </Modal>
    );
};
