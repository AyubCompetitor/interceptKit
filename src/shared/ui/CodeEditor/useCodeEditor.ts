import { formatJsonText } from '#shared/lib';

import { CodeLanguages, type CodeLanguage } from './types.ts';

/** The format button of a JSON editor: it works once the text parses and is not laid out yet */
export const useCodeEditor = (value: string, language: CodeLanguage, onChange: (value: string) => void) => {
    const isJson = language === CodeLanguages.JSON;
    const formattedJson = isJson ? formatJsonText(value) : undefined;
    const isFormattable = formattedJson !== undefined && formattedJson !== value;

    const onFormat = () => {
        if (formattedJson === undefined) {
            return;
        }

        onChange(formattedJson);
    };

    return {
        isJson,
        isFormattable,

        onFormat,
    };
};
