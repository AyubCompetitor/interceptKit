import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '#shared/config';

const LANGUAGE_SEPARATOR_RGX = /[-_]/;

const DEFAULT_PREFERENCE = 'auto';

type Preference = Locale | typeof DEFAULT_PREFERENCE;

const getSupportedLanguage = (uiLanguage: string) => {
    const [selectedLanguage] = uiLanguage.toLowerCase().split(LANGUAGE_SEPARATOR_RGX)

    const language = SUPPORTED_LOCALES.find(locale => locale === selectedLanguage);

    if (!language) {
        return DEFAULT_LOCALE;
    }

    return language;
};


export const resolveLocale = (preference: Preference, uiLanguage: string): Locale => {
    if (preference !== DEFAULT_PREFERENCE) {
        return preference;
    }

    return getSupportedLanguage(uiLanguage);
};
