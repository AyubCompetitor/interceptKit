import type { ChangeEvent, FC } from 'react';

import type { VariableDraft } from '../../model/environmentDraft.ts';
import { useEnvironmentForm } from '../../model/useEnvironmentForm.ts';
import { useVault } from '../../model/useVault.ts';

import { VaultStates, type Environment } from '#entities/environment';
import { isVaultRequired, usePolicy } from '#features/policy';
import { useTranslation } from '#shared/i18n';
import { Field, Notice, NoticeTones, Typography, TypographyColors } from '#shared/ui';

import styles from './EnvironmentForm.module.css';
import { VariableTable } from './VariableTable.tsx';

interface EnvironmentFormProps {
    /** Id the submit button in the dialog footer points at */
    formId: string;
    /** Environment to edit, or undefined for a new one */
    environment: NotRequired<Environment>;
    /** Called once the background has saved the environment */
    onSaved: VoidFunction;
}

/** Without the vault secrets are only hidden on the screen, or refused when the policy requires the vault; the form says so */
export const EnvironmentForm: FC<EnvironmentFormProps> = ({ formId, environment, onSaved }) => {
    const { t } = useTranslation();
    const { vaultState } = useVault();
    const { policy } = usePolicy();
    const { draft, saveError, isVaultLocked, onDraftChange, onEnvironmentSubmit } = useEnvironmentForm(
        environment,
        onSaved,
    );

    const isSaveFailed = saveError !== undefined;
    const isVaultOff = vaultState === VaultStates.OFF;

    const onNameChange = (event: ChangeEvent<HTMLInputElement>) => onDraftChange({ name: event.target.value });

    const onVariablesChange = (variables: VariableDraft[]) => onDraftChange({ variables });

    return (
        <form className={styles.form} id={formId} onSubmit={onEnvironmentSubmit}>
            <Field label={t('apiClientEnvironmentName')}>
                <input
                    placeholder={t('apiClientEnvironmentNamePlaceholder')}
                    value={draft.name}
                    required
                    onChange={onNameChange}
                />
            </Field>

            <VariableTable variables={draft.variables} onVariablesChange={onVariablesChange} />

            {isVaultOff && (
                <Notice tone={NoticeTones.WARNING}>
                    {t(isVaultRequired(policy) ? 'apiClientVaultRequiredWarning' : 'apiClientSecretsWarning')}
                </Notice>
            )}

            {!isVaultOff && <Notice tone={NoticeTones.INFO}>{t('apiClientSecretsEncrypted')}</Notice>}

            {isVaultLocked && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t(isVaultOff ? 'apiClientVaultRequiredSave' : 'apiClientVaultLockedSave')}
                </Typography>
            )}

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientEnvironmentSaveFailed', saveError)}
                </Typography>
            )}
        </form>
    );
};
