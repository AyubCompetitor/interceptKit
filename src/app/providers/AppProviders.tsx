import { settingsItem } from '#entities/config';
import { I18nProvider, resolveLocale } from '#shared/i18n';
import { getUILanguage, useStorageItem } from '#shared/platform';

export const AppProviders: FCC = ({ children }) => {
    const settings = useStorageItem(settingsItem);

    if (!settings) {
        return null;
    }

    const locale = resolveLocale(settings.locale, getUILanguage());

    return <I18nProvider locale={locale}>{children}</I18nProvider>;
};
