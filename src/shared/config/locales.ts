export enum Locales {
    en = 'en',
    ru = 'ru',
}

export type Locale = `${Locales}`;

export const SUPPORTED_LOCALES = Object.values(Locales);

export const DEFAULT_LOCALE = Locales.en;
