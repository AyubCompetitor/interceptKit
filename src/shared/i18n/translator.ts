import type { Locale } from '#shared/config';

import en from './messages/en.json' with { type: 'json' };
import ru from './messages/ru.json' with { type: 'json' };

interface MessageEntry {
    /** Text with $name$ placeholders and substitutions */
    readonly message: string;
    /** Named placeholders, lowercase keyed */
    readonly placeholders?: Placeholders;
}

export type Placeholders = Readonly<Record<string, { readonly content: string }>>;

export type MessageKey = keyof typeof en;

export type Catalog = Readonly<Record<MessageKey, MessageEntry>>;

export type Translate = (key: MessageKey, ...substitutions: readonly string[]) => string;

export const CATALOGS: Readonly<Record<Locale, Catalog>> = {
    en,
    ru,
};

const VAR_CHAR = '$';

const RGX_PATTERNS = {
    VAR: /\$([A-Za-z0-9_@]+)\$/g,
    IDX: /\$(\$|[1-9])/g,
};

const format = (entry: MessageEntry, substitutions: readonly string[]): string => {
    const expanded = entry.message.replace(
        RGX_PATTERNS.VAR,
        (match, name: string) => entry.placeholders?.[name.toLowerCase()]?.content ?? match,
    );

    return expanded.replace(RGX_PATTERNS.IDX, (_match, token: string) =>
        token === VAR_CHAR ? VAR_CHAR : (substitutions[Number(token) - 1] ?? ''),
    );
};

export const createTranslator =
    (locale: Locale): Translate =>
        (key, ...substitutions) =>
            format(CATALOGS[locale][key], substitutions);
