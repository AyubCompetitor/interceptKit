import { useContext } from 'react';

import { I18nContext, type I18nValue } from './context.ts';

export const useTranslation = (): I18nValue => {
    const value = useContext(I18nContext);

    if (!value) {
        throw new Error('useTranslation() must be used inside <I18nProvider>');
    }

    return value;
};
