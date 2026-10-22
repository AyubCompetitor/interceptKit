import type { Environment } from './environment.ts';

/** Values of the variables by name */
export type VariableValues = ReadonlyMap<string, string>;

/** {{name}} with the same name rule as variable keys; no spaces inside the braces */
const TEMPLATE_RGX = /\{\{([A-Za-z_][A-Za-z0-9_.-]*)\}\}/g;

/** What the templates of a request can use: switched-off variables are kept but not used, and encrypted ones wait for the vault */
export const getVariableValues = (environment: NotRequired<Environment>): VariableValues => {
    const values = new Map<string, string>();

    for (const { key, value, enabled } of environment?.variables ?? []) {
        const isPlainValue = typeof value === 'string';

        if (enabled && isPlainValue) {
            values.set(key, value);
        }
    }

    return values;
};

/** Puts the values in place of {{name}}; a name without a value stays as typed */
export const fillVariables = (text: string, values: VariableValues): string => {
    return text.replace(TEMPLATE_RGX, (template, name: string) => values.get(name) ?? template);
};

const getTemplateNames = (text: string): string[] => {
    const matches = [...text.matchAll(TEMPLATE_RGX)];

    return matches.map(match => match[1] ?? '');
};

/** Names used in the texts that have no value, once each, in the order they appear */
export const getMissingVariables = (texts: readonly string[], values: VariableValues): string[] => {
    const names = texts.flatMap(getTemplateNames);
    const missingNames = names.filter(name => !values.has(name));

    return [...new Set(missingNames)];
};
