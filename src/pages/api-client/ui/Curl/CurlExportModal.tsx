import type { FC } from 'react';

import { useCurlExport } from '../../model/useCurlExport.ts';

import type { ApiRequest } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonVariants,
    Checkbox,
    Field,
    Flex,
    Modal,
    ModalSizes,
    Notice,
    Spaces,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import styles from './CurlExportModal.module.css';

interface CurlExportModalProps {
    /** The request to write as a command */
    request: ApiRequest;
    /** Called on every close */
    onClose: VoidFunction;
}

const NAME_SEPARATOR = ', ';

const COMMAND_ROWS = 10;

/** Mounted only while open: the command is built for the request it was opened with */
export const CurlExportModal: FC<CurlExportModalProps> = ({ request, onClose }) => {
    const { t } = useTranslation();
    const {
        command,
        missingNames,
        isWithSecrets,
        isWithSecretVariables,
        isCopied,
        isCopyFailed,
        onSecretsToggle,
        onCommandCopy,
    } = useCurlExport(request);

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onClose}>{t('dialogClose')}</Button>

                    <Button variant={ButtonVariants.PRIMARY} onClick={onCommandCopy}>
                        {t('apiClientCurlExportCopy')}
                    </Button>
                </>
            }
            size={ModalSizes.LARGE}
            title={t('apiClientCurlExportTitle')}
            isOpen
            onClose={onClose}
        >
            <Flex direction='column' gap={Spaces.L}>
                <Field label={t('apiClientCurlExportCommand')}>
                    <textarea
                        className={styles.command}
                        rows={COMMAND_ROWS}
                        spellCheck={false}
                        value={command}
                        readOnly
                    />
                </Field>

                {isWithSecretVariables && (
                    <Flex direction='column' gap={Spaces.XS}>
                        <Checkbox
                            checked={isWithSecrets}
                            label={t('apiClientCurlExportSecrets')}
                            onChange={onSecretsToggle}
                        />

                        <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                            {t('apiClientCurlExportSecretsHint')}
                        </Typography>
                    </Flex>
                )}

                {!!missingNames.length && (
                    <Notice>{t('apiClientCurlExportMissing', missingNames.join(NAME_SEPARATOR))}</Notice>
                )}

                {request.sendCookies && <Notice>{t('apiClientCurlExportCookies')}</Notice>}

                {isCopied && (
                    <Typography color={TypographyColors.HINT} role='status'>
                        {t('apiClientCurlExportCopied')}
                    </Typography>
                )}

                {isCopyFailed && (
                    <Typography color={TypographyColors.DANGER} role='alert'>
                        {t('apiClientCurlExportCopyFailed')}
                    </Typography>
                )}
            </Flex>
        </Modal>
    );
};
