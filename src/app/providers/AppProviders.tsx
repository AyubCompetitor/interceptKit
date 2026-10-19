import { settingsItem } from '#entities/config';
import { I18nProvider, resolveLocale } from '#shared/i18n';
import { getUILanguage, useStorageItem } from '#shared/platform';

export const AppProviders: FCC = ({ children }) => {
    const settings = useStorageItem(settingsItem);

    if (!settings) {
        return null;
    }

    return <I18nProvider locale={resolveLocale(settings.locale, getUILanguage())}>{children}</I18nProvider>;
};
