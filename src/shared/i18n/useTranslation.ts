import { useContext } from 'react';

import { I18nContext, type I18nValue } from './context.ts';

const CTX_ERROR = 'useTranslation() must be used inside <I18nProvider>';

export const useTranslation = (): I18nValue => {
    const value = useContext(I18nContext);

    if (!value) {
        throw new Error(CTX_ERROR);
    }

    return value;
};
