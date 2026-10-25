export type JsonObject = Readonly<Record<string, unknown>>;

export const isJsonObject = (value: unknown): value is JsonObject =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const getText = (value: unknown): NotRequired<string> => {
    if (typeof value !== 'string') {
        return;
    }

    return value;
};

export const getValueText = (value: unknown): NotRequired<string> => {
    const isPrimitive = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

    if (!isPrimitive) {
        return;
    }

    return String(value);
};

export const getObjects = (value: unknown): JsonObject[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(isJsonObject);
};

export const getObject = (value: unknown): NotRequired<JsonObject> => {
    if (!isJsonObject(value)) {
        return;
    }

    return value;
};

export const getFirstItem = (value: unknown): unknown => {
    if (!Array.isArray(value)) {
        return;
    }

    return value[0];
};

export const getField = (object: NotRequired<JsonObject>, key: string): unknown => {
    if (!object || !Object.hasOwn(object, key)) {
        return;
    }

    return object[key];
};
