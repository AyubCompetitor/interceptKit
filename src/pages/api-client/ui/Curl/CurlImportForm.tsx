import type { FC } from 'react';

import { useCurlImportForm } from '../../model/useCurlImportForm.ts';

import type { CurlImport } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Field, Typography, TypographyColors } from '#shared/ui';

import styles from './CurlImportForm.module.css';

const COMMAND_ROWS = 10;

interface CurlImportFormProps {
    /** Id the submit button in the dialog footer points at */
    formId: string;
    /** Opens the imported request in a new tab */
    onImport: (imported: CurlImport) => void;
    /** Called once the command is imported */
    onDone: VoidFunction;
}

export const CurlImportForm: FC<CurlImportFormProps> = ({ formId, onImport, onDone }) => {
    const { t } = useTranslation();
    const { command, importError, onCommandChange, onImportSubmit } = useCurlImportForm(onImport, onDone);

    const isImportFailed = importError !== undefined;

    return (
        <form className={styles.form} id={formId} onSubmit={onImportSubmit}>
            <Field hint={t('apiClientCurlCommandHint')} label={t('apiClientCurlCommand')}>
                <textarea
                    className={styles.command}
                    placeholder={t('apiClientCurlCommandPlaceholder')}
                    rows={COMMAND_ROWS}
                    spellCheck={false}
                    value={command}
                    required
                    onChange={onCommandChange}
                />
            </Field>

            {isImportFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientCurlImportFailed', importError)}
                </Typography>
            )}
        </form>
    );
};
