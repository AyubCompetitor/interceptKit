import type { FC } from 'react';

import { useVaultPasswordForm } from '../../model/useVaultPasswordForm.ts';

import type { VaultPasswordParams } from '#entities/environment';
import { useTranslation } from '#shared/i18n';
import type { RpcMethod } from '#shared/lib';
import { Field, Typography, TypographyColors } from '#shared/ui';

import styles from './VaultPasswordForm.module.css';

interface VaultPasswordFormProps {
    /** Id the submit button in the dialog footer points at */
    formId: string;
    /** What the password is asked for */
    text: string;
    /** Background method the password goes to */
    method: RpcMethod<VaultPasswordParams, boolean>;
    /** Called once the background accepted the password */
    onDone: VoidFunction;
}

export const VaultPasswordForm: FC<VaultPasswordFormProps> = ({ formId, text, method, onDone }) => {
    const { t } = useTranslation();
    const { password, isWrongPassword, isFailed, onPasswordChange, onPasswordSubmit } = useVaultPasswordForm(
        method,
        onDone,
    );

    return (
        <form className={styles.form} id={formId} onSubmit={onPasswordSubmit}>
            <p>{text}</p>

            <Field label={t('apiClientVaultPassword')}>
                <input
                    autoComplete='current-password'
                    type='password'
                    value={password}
                    required
                    onChange={onPasswordChange}
                />
            </Field>

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
