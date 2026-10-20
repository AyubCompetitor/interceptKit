import type { LocalePreference } from '#entities/config';
import { Locales } from '#shared/config';
import type { MessageKey } from '#shared/i18n';

export interface LanguageOption {
    /** Stored preference */
    readonly value: LocalePreference;
    /** Message key of the option label */
    readonly label: MessageKey;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
    { value: 'auto', label: 'languageAuto' },
    { value: Locales.en, label: 'languageEnglish' },
    { value: Locales.ru, label: 'languageRussian' },
];
