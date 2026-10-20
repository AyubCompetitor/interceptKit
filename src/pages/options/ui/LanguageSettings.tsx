import { useId, type FC } from 'react';

import { useLanguageSettings } from '../model/useLanguageSettings.ts';

import { useTranslation } from '#shared/i18n';
import { Flex, Spaces, Typography, TypographyColors } from '#shared/ui';

import { LANGUAGE_OPTIONS } from './languageOptions.ts';

export const LanguageSettings: FC = () => {
    const id = useId();

    const { t } = useTranslation();
    const { locale, isSaveFailed, onLocaleChange } = useLanguageSettings();

    return (
        <Flex aria-labelledby={`${id}-title`} align='start' as='section' direction='column' gap={Spaces.S}>
            <h2 id={`${id}-title`}>{t('settingsTitle')}</h2>
            <label htmlFor={id}>{t('settingsLanguage')}</label>
            <select id={id} value={locale} onChange={onLocaleChange}>
                {LANGUAGE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                        {t(option.label)}
                    </option>
                ))}
            </select>
            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('settingsSaveFailed')}
                </Typography>
            )}
        </Flex>
    );
};
