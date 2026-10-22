/** Indent of formatted JSON, the same as in the code of the project */
const JSON_INDENT = 4;

const parseJsonText = (text: string): NotRequired<{ value: unknown }> => {
    try {
        return { value: JSON.parse(text) };
    } catch {
        return;
    }
};

export const isJsonText = (text: string): boolean => parseJsonText(text) !== undefined;

/** The JSON laid out with indents; nothing for text that is not JSON */
export const formatJsonText = (text: string): NotRequired<string> => {
    const parsed = parseJsonText(text);

    if (parsed === undefined) {
        return;
    }

    return JSON.stringify(parsed.value, null, JSON_INDENT);
};
