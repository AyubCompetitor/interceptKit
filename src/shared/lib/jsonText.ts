const JSON_INDENT = 4;

export const isJsonText = (text: string): boolean => parseJsonText(text) !== undefined;

const parseJsonText = (text: string): NotRequired<{ value: unknown }> => {
    try {
        return {
            value: JSON.parse(text),
        };
    } catch {
        return;
    }
};

/** The JSON laid out with indents */
export const formatJsonText = (text: string): NotRequired<string> => {
    const parsed = parseJsonText(text);

    if (parsed === undefined) {
        return;
    }

    return JSON.stringify(parsed.value, null, JSON_INDENT);
};
