import { useEffect } from 'react';

import type { Locale } from '#shared/config';

import { I18nContext } from './context.ts';
import { createTranslator } from './translator.ts';

interface I18nProviderProps {
    /** Language of the subtree, also set as <html lang> */
    locale: Locale;
}

export const I18nProvider: FCC<I18nProviderProps> = ({ locale, children }) => {
    const t = createTranslator(locale);

    const value = { locale, t };

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    return <I18nContext value={value}>{children}</I18nContext>;
};
