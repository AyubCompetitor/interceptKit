import { useId, type FC } from 'react';

import { useCurlImportDialog } from '../../lib/useCurlImportDialog.ts';

import type { CurlImport } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Icon, IconNames, Modal, ModalSizes } from '#shared/ui';

import { CurlImportForm } from './CurlImportForm.tsx';

interface CurlImportControlProps {
    /** Opens the imported request in a new tab */
    onImport: (imported: CurlImport) => void;
}

export const CurlImportControl: FC<CurlImportControlProps> = ({ onImport }) => {
    const formId = useId();
    const { t } = useTranslation();
    const { isDialogOpen, onDialogOpen, onDialogClose } = useCurlImportDialog();

    return (
        <>
            <Button onClick={onDialogOpen}>
                <Icon name={IconNames.TRANSFER} />
                {t('apiClientCurlImportOpen')}
            </Button>

            <Modal
                footer={
                    <>
                        <Button onClick={onDialogClose}>{t('apiClientCurlCancel')}</Button>

                        <Button form={formId} type='submit' variant={ButtonVariants.PRIMARY}>
                            {t('apiClientCurlImportSubmit')}
                        </Button>
                    </>
                }
                isOpen={isDialogOpen}
                size={ModalSizes.LARGE}
                title={t('apiClientCurlImportTitle')}
                onClose={onDialogClose}
            >
                <CurlImportForm formId={formId} onDone={onDialogClose} onImport={onImport} />
            </Modal>
        </>
    );
};
