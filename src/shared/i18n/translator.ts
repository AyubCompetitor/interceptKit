import type { Locale } from '#shared/config';

import en from './messages/en.json' with { type: 'json' };
import ru from './messages/ru.json' with { type: 'json' };

export interface MessageEntry {
    /** Text with $name$ placeholders and values */
    readonly message: string;
    /** Named placeholders, lowercase keyed */
    readonly placeholders?: Placeholders;
}

export type Placeholders = Readonly<Record<string, { readonly content: string }>>;

export type MessageKey = keyof typeof en;

export type Catalog = Readonly<Record<MessageKey, MessageEntry>>;

export type TFunction = (key: MessageKey, ...values: readonly string[]) => string;

export const CATALOGS: Readonly<Record<Locale, Catalog>> = {
    en,
    ru,
};

const DOLLAR_SIGN = '$';

const PLACEHOLDER_RGXS = {
    NAMED: /\$([A-Za-z0-9_@]+)\$/g,
    NUMBERED: /\$(\$|[1-9])/g,
};

const replacePlaceholders = (message: string, placeholders: Placeholders): string =>
    message.replace(
        PLACEHOLDER_RGXS.NAMED,
        (match, name: string) => placeholders[name.toLowerCase()]?.content ?? match,
    );

export const fillPlaceholders = ({ message, placeholders }: MessageEntry): string => {
    if (!placeholders) {
        return message;
    }

    return replacePlaceholders(message, placeholders);
};

const fillTemplate = (template: string, values: readonly string[]): string => {
    return template.replace(PLACEHOLDER_RGXS.NUMBERED, (_match, token: string) => {
        if (token === DOLLAR_SIGN) {
            return DOLLAR_SIGN;
        }

        const idx = Number(token) - 1;

        return values[idx] ?? '';
    });
};

export const formatMessage = (entry: MessageEntry, values: readonly string[]): string => {
    const text = fillPlaceholders(entry);

    return fillTemplate(text, values);
};

export const createTFunction = (locale: Locale): TFunction => {
    const catalog = CATALOGS[locale];

    return (key, ...values) => formatMessage(catalog[key], values);
};
