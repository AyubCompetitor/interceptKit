import type { FC } from 'react';

import { useFileImport } from '../../model/useFileImport.ts';

import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonVariants,
    Field,
    Flex,
    Modal,
    ModalSizes,
    Spaces,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import { ImportPreview } from './ImportPreview.tsx';
import styles from './FileImportModal.module.css';

interface FileImportModalProps {
    /** Called on every close, and once the import is done */
    onClose: VoidFunction;
}

const FILE_TYPES = 'application/json,.json';

const TEXT_ROWS = 8;

const MAX_SHOWN_ISSUES = 10;

/** Mounted only while open, so every import starts from an empty form */
export const FileImportModal: FC<FileImportModalProps> = ({ onClose }) => {
    const { t } = useTranslation();

    const names = {
        unnamed: t('apiClientImportUnnamed'),
        variablesSuffix: t('apiClientImportVariablesSuffix'),
    };

    const {
        text,
        parsed,
        importedFile,
        secretMode,
        secretCount,
        emptySecretNames,
        importError,
        isFileUnreadable,
        isCollectionLimitReached,
        isEnvironmentLimitReached,
        isImportBlocked,
        onTextChange,
        onFileChoose,
        onImportConfirm,
    } = useFileImport(names, onClose);

    return (
        <Modal
            footer={
                <>
                    <Button onClick={onClose}>{t('apiClientImportCancel')}</Button>

                    <Button disabled={isImportBlocked} variant={ButtonVariants.PRIMARY} onClick={onImportConfirm}>
                        {t('apiClientImportSubmit')}
                    </Button>
                </>
            }
            size={ModalSizes.LARGE}
            title={t('apiClientImportTitle')}
            isOpen
            onClose={onClose}
        >
            <Flex direction='column' gap={Spaces.L}>
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('apiClientImportHint')}
                </Typography>

                <Field label={t('apiClientImportFile')}>
                    <input accept={FILE_TYPES} type='file' onChange={onFileChoose} />
                </Field>

                <Field label={t('apiClientImportText')}>
                    <textarea
                        className={styles.text}
                        rows={TEXT_ROWS}
                        spellCheck={false}
                        value={text}
                        onChange={onTextChange}
                    />
                </Field>

                {isFileUnreadable && (
                    <Typography color={TypographyColors.DANGER} role='alert'>
                        {t('apiClientImportFileUnreadable')}
                    </Typography>
                )}

                {parsed && !parsed.ok && (
                    <Flex direction='column' gap={Spaces.XS} role='alert'>
                        <Typography color={TypographyColors.DANGER}>{t('apiClientImportInvalid')}</Typography>

                        <ul className={styles.issues}>
                            {parsed.issues.slice(0, MAX_SHOWN_ISSUES).map(issue => (
                                <li key={`${issue.path}:${issue.message}`}>{`${issue.path}: ${issue.message}`}</li>
                            ))}
                        </ul>
                    </Flex>
                )}

                {importedFile && (
                    <ImportPreview
                        emptySecretNames={emptySecretNames}
                        importedFile={importedFile}
                        isCollectionLimitReached={isCollectionLimitReached}
                        isEnvironmentLimitReached={isEnvironmentLimitReached}
                        secretCount={secretCount}
                        secretMode={secretMode}
                    />
                )}

                {importError !== undefined && (
                    <Typography color={TypographyColors.DANGER} role='alert'>
                        {t('apiClientImportFailed', importError)}
                    </Typography>
                )}
            </Flex>
        </Modal>
    );
};
