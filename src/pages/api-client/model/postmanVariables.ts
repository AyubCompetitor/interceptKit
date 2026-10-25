import { getObjects, getText, getValueText, type JsonObject } from '../lib/jsonValue.ts';

import { isVariableKey, type EnvVariable } from '#entities/environment';

import { addImportGap, ImportGapTypes, type ImportGapTallies } from './importGaps.ts';

const SECRET_TYPE = 'secret';

/** Variables of a collection say disabled, those of an environment say enabled */
const isVariableEnabled = (variable: JsonObject): boolean => variable.disabled !== true && variable.enabled !== false;

/** Variables of a collection or an environment; the first of two with one name wins */
export const readPostmanVariables = (list: unknown, gaps: ImportGapTallies): EnvVariable[] => {
    const variables: EnvVariable[] = [];
    const keys = new Set<string>();

    for (const variable of getObjects(list)) {
        const key = getText(variable.key) ?? getText(variable.id) ?? '';

        if (key === '' || keys.has(key)) {
            continue;
        }

        if (!isVariableKey(key)) {
            addImportGap(gaps, ImportGapTypes.VARIABLE_NAMES, [key]);

            continue;
        }

        keys.add(key);

        variables.push({
            key,
            value: getValueText(variable.value) ?? '',
            enabled: isVariableEnabled(variable),
            secret: variable.type === SECRET_TYPE,
        });
    }

    return variables;
};
