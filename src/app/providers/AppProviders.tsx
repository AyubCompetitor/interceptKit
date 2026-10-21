import { DEFAULT_SETTINGS, resolveTheme, settingsItem } from '#entities/config';
import { I18nProvider, resolveLocale } from '#shared/i18n';
import { getUILanguage, useStorageItem } from '#shared/platform';
import { useDocumentTheme } from '#shared/ui';

export const AppProviders: FCC = ({ children }) => {
    const settings = useStorageItem(settingsItem);

    useDocumentTheme(resolveTheme(settings ?? DEFAULT_SETTINGS));

    if (!settings) {
        return null;
    }

    const locale = resolveLocale(settings.locale, getUILanguage());

    return <I18nProvider locale={locale}>{children}</I18nProvider>;
};
