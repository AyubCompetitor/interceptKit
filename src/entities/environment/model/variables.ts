import { isEncryptedValue, type Environment, type EnvVariable } from './environment.ts';

/** Values of the variables by name */
export type VariableValues = ReadonlyMap<string, string>;

/** {{name}} with the same name rule as variable keys; no spaces inside the braces */
const TEMPLATE_RGX = /\{\{([A-Za-z_][A-Za-z0-9_.-]*)\}\}/g;

const NO_SECRETS: VariableValues = new Map();

const getVariableValue = (variable: EnvVariable, secrets: VariableValues): NotRequired<string> => {
    if (!variable.enabled) {
        return;
    }

    if (isEncryptedValue(variable.value)) {
        return secrets.get(variable.key);
    }

    return variable.value;
};

/** What the templates can use: switched-off variables are skipped, encrypted ones come from the unlocked vault */
export const getVariableValues = (
    environment: NotRequired<Environment>,
    secrets: VariableValues = NO_SECRETS,
): VariableValues => {
    const values = new Map<string, string>();

    for (const variable of environment?.variables ?? []) {
        const value = getVariableValue(variable, secrets);

        if (value !== undefined) {
            values.set(variable.key, value);
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

/** Names used in the texts, once each, in the order they appear */
export const getUsedVariables = (texts: readonly string[]): string[] => {
    const names = texts.flatMap(getTemplateNames);

    return [...new Set(names)];
};

/** Names used in the texts that have no value, once each, in the order they appear */
export const getMissingVariables = (texts: readonly string[], values: VariableValues): string[] => {
    const names = getUsedVariables(texts);

    return names.filter(name => !values.has(name));
};
