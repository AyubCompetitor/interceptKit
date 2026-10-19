import { useId, useState, type ChangeEvent, type FC } from 'react';

import { settingsItem, settingsRpc, type LocalePreference } from '#entities/config';
import { Locales } from '#shared/config';
import { useTranslation, type MessageKey } from '#shared/i18n';
import { call } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';
import { Flex, Spaces } from '#shared/ui';

import styles from './LanguageSettings.module.css';

interface LanguageOption {
    /** Stored preference. */
    readonly value: LocalePreference;
    /** Message key of the option label. */
    readonly label: MessageKey;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
    { value: 'auto', label: 'languageAuto' },
    { value: Locales.en, label: 'languageEnglish' },
    { value: Locales.ru, label: 'languageRussian' },
];

export const LanguageSettings: FC = () => {
    const { t } = useTranslation();
    const id = useId();
    const settings = useStorageItem(settingsItem);
    const [isSaveFailed, setIsSaveFailed] = useState(false);

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const option = LANGUAGE_OPTIONS.find(({ value }) => value === event.target.value);

        if (option === undefined) {
            return;
        }

        /** The background validates and stores the change; every open page picks it up from storage. */
        call(settingsRpc.update, { locale: option.value }).then(
            () => setIsSaveFailed(false),
            () => setIsSaveFailed(true),
        );
    };

    return (
        <Flex aria-labelledby={`${id}-title`} align='start' as='section' direction='column' gap={Spaces.S}>
            <h2 id={`${id}-title`}>{t('settingsTitle')}</h2>
            <label htmlFor={id}>{t('settingsLanguage')}</label>
            <select id={id} value={settings?.locale ?? 'auto'} onChange={handleChange}>
                {LANGUAGE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                        {t(label)}
                    </option>
                ))}
            </select>
            {isSaveFailed && (
                <p className={styles.error} role='alert'>
                    {t('settingsSaveFailed')}
                </p>
            )}
        </Flex>
    );
};
