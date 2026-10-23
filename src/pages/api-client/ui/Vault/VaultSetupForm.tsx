import type { FC } from 'react';

import { useVaultSetupForm } from '../../model/useVaultSetupForm.ts';

import { VAULT_CONFIG } from '#shared/config';
import { useTranslation } from '#shared/i18n';
import { Field, Notice, NoticeTones, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import styles from './VaultSetupForm.module.css';

const AUTO_LOCK_MINUTES = String(VAULT_CONFIG.AUTO_LOCK_MS / 60_000);

interface VaultSetupFormProps {
    /** Id the submit button in the dialog footer points at */
    formId: string;
    /** Called once the vault is on */
    onDone: VoidFunction;
}

export const VaultSetupForm: FC<VaultSetupFormProps> = ({ formId, onDone }) => {
    const { t } = useTranslation();

    const {
        password,
        repeatedPassword,
        isMismatch,
        isFailed,
        onPasswordChange,
        onRepeatedPasswordChange,
        onSetupSubmit,
    } = useVaultSetupForm(onDone);

    return (
        <form className={styles.form} id={formId} onSubmit={onSetupSubmit}>
            <p>{t('apiClientVaultSetupText')}</p>

            <Field
                hint={t('apiClientVaultPasswordHint', String(VAULT_CONFIG.MIN_PASSWORD_LENGTH))}
                label={t('apiClientVaultPassword')}
            >
                <input
                    autoComplete='new-password'
                    minLength={VAULT_CONFIG.MIN_PASSWORD_LENGTH}
                    type='password'
                    value={password}
                    required
                    onChange={onPasswordChange}
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

            <Notice tone={NoticeTones.WARNING}>{t('apiClientVaultSetupWarning')}</Notice>

            <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {t('apiClientVaultAutoLockHint', AUTO_LOCK_MINUTES)}
            </Typography>

            {isMismatch && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientVaultPasswordMismatch')}
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
