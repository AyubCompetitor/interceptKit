import type { FC } from 'react';

import { useVaultPasswordChange } from '../../model/useVaultPasswordChange.ts';

import { VAULT_CONFIG } from '#shared/config';
import { useTranslation } from '#shared/i18n';
import { Field, Typography, TypographyColors } from '#shared/ui';

import styles from './VaultPasswordChangeForm.module.css';

interface VaultPasswordChangeFormProps {
    /** Id the submit button in the dialog footer points at */
    formId: string;
    /** Called once the secrets are under the new password */
    onDone: VoidFunction;
}

export const VaultPasswordChangeForm: FC<VaultPasswordChangeFormProps> = ({ formId, onDone }) => {
    const { t } = useTranslation();

    const {
        password,
        newPassword,
        repeatedPassword,
        isMismatch,
        isWrongPassword,
        isFailed,
        onPasswordChange,
        onNewPasswordChange,
        onRepeatedPasswordChange,
        onChangeSubmit,
    } = useVaultPasswordChange(onDone);

    return (
        <form className={styles.form} id={formId} onSubmit={onChangeSubmit}>
            <p>{t('apiClientVaultChangeText')}</p>

            <Field label={t('apiClientVaultCurrentPassword')}>
                <input
                    autoComplete='current-password'
                    type='password'
                    value={password}
                    required
                    onChange={onPasswordChange}
                />
            </Field>

            <Field
                hint={t('apiClientVaultPasswordHint', String(VAULT_CONFIG.MIN_PASSWORD_LENGTH))}
                label={t('apiClientVaultNewPassword')}
            >
                <input
                    autoComplete='new-password'
                    minLength={VAULT_CONFIG.MIN_PASSWORD_LENGTH}
                    type='password'
                    value={newPassword}
                    required
                    onChange={onNewPasswordChange}
                />
            </Field>

            <Field label={t('apiClientVaultPasswordRepeat')}>
                <input
                    autoComplete='new-password'
                    type='password'
                    value={repeatedPassword}
                    required
                    onChange={onRepeatedPasswordChange}
                />
            </Field>

            {isMismatch && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientVaultPasswordMismatch')}
                </Typography>
            )}

            {isWrongPassword && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientVaultWrongPassword')}
                </Typography>
            )}

            {isFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientVaultFailed')}
                </Typography>
            )}
        </form>
    );
};
