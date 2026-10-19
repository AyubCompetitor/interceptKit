import { createContext } from 'react';

import type { Locale } from '#shared/config';

import type { Translate } from './translator.ts';

export interface I18nValue {
    /** Active interface language. */
    readonly locale: Locale;
    /** Translates a message key into the active language. */
    readonly t: Translate;
}

export const I18nContext = createContext<NotRequired<I18nValue>>(undefined);
