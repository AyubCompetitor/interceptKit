import { useId, type FC } from 'react';

import { useBundleImport } from '../../model/useBundleImport.ts';

import type { BundleContent } from '#features/transfer';
import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonVariants,
    Field,
    FileDropzone,
    Flex,
    Notice,
    NoticeTones,
    Spaces,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import { BundleCountsList } from './BundleCountsList.tsx';
import styles from './BundleImport.module.css';

const BUNDLE_FILE_TYPES = 'application/json,.json';

const TEXT_ROWS = 8;

const MAX_SHOWN_ISSUES = 10;

interface BundleImportProps {
    /** The lists stored now, for the preview */
    content: BundleContent;
}

export const BundleImport: FC<BundleImportProps> = ({ content }) => {
    const titleId = useId();
    const { t } = useTranslation();

    const {
        text,
        preview,
        importedCounts,
        importError,
        isFileUnreadable,
        onTextChange,
        onFileChoose,
        onImportConfirm,
    } = useBundleImport(content);

    return (
        <Flex aria-labelledby={titleId} as='section' className={styles.card} direction='column' gap={Spaces.L}>
            <h2 id={titleId}>{t('transferImportTitle')}</h2>

            <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {t('transferImportHint')}
            </Typography>

            <Field label={t('transferImportFile')}>
                <FileDropzone
                    accept={BUNDLE_FILE_TYPES}
                    hint={t('transferImportFileHint')}
                    label={t('transferImportFile')}
                    onChange={onFileChoose}
                />
            </Field>

            <Field label={t('transferImportText')}>
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
                    {t('transferFileUnreadable')}
                </Typography>
            )}

            {preview && !preview.ok && (
                <Flex direction='column' gap={Spaces.XS} role='alert'>
                    <Typography color={TypographyColors.DANGER}>{t('transferImportInvalid')}</Typography>

                    <ul className={styles.issues}>
                        {preview.issues.slice(0, MAX_SHOWN_ISSUES).map(issue => (
                            <li key={`${issue.path}:${issue.message}`}>{`${issue.path}: ${issue.message}`}</li>
                        ))}
                    </ul>
                </Flex>
            )}

            {preview?.ok && (
                <Flex aria-label={t('transferPreview')} as='section' direction='column' gap={Spaces.S}>
                    <Typography>{t('transferPreview')}</Typography>

                    <BundleCountsList counts={preview.value} />

                    <div>
                        <Button variant={ButtonVariants.PRIMARY} onClick={onImportConfirm}>
                            {t('transferImportSubmit')}
                        </Button>
                    </div>
                </Flex>
            )}

            {importedCounts && (
                <Notice tone={NoticeTones.INFO}>
                    <Flex direction='column' gap={Spaces.XS} role='status'>
                        {t('transferImportDone')}

                        <BundleCountsList counts={importedCounts} />
                    </Flex>
                </Notice>
            )}

            {importError !== undefined && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('transferImportFailed', importError)}
                </Typography>
            )}
        </Flex>
    );
};
