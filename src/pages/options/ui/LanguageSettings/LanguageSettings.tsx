import type { FC } from 'react';

import { useLanguageSettings } from '../../model/useLanguageSettings.ts';

import { useTranslation } from '#shared/i18n';
import { Field, Flex, Spaces, Typography, TypographyColors } from '#shared/ui';

import { LANGUAGE_OPTIONS } from './languageOptions.ts';
import styles from './LanguageSettings.module.css';

export const LanguageSettings: FC = () => {
    const { t } = useTranslation();
    const { locale, isSaveFailed, onLocaleChange } = useLanguageSettings();

    return (
        <Flex direction='column' gap={Spaces.S}>
            <Field className={styles.field} label={t('settingsLanguage')}>
                <select value={locale} onChange={onLocaleChange}>
                    {LANGUAGE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {t(option.label)}
                        </option>
                    ))}
                </select>
            </Field>

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('settingsSaveFailed')}
                </Typography>
            )}
        </Flex>
    );
};
