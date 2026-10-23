const LINE_CONTINUATION_RGX = /\\\r?\n/g;

const WHITESPACE_RGX = /\s/;

const ANSI_C_ESCAPES: Readonly<Record<string, string>> = {
    n: '\n',
    t: '\t',
    r: '\r',
    '\\': '\\',
    "'": "'",
    '"': '"',
    '0': '\0',
};

const ANSI_C_HEX_RGX = /^(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/;

const DOUBLE_QUOTE_ESCAPES = new Set(['"', '\\', '$', '`']);

interface Reader {
    /** The command being split */
    readonly text: string;
    /** Position of the next character */
    index: number;
}

const readSingleQuoted = (reader: Reader): NotRequired<string> => {
    const end = reader.text.indexOf("'", reader.index);

    if (end === -1) {
        return;
    }

    const value = reader.text.slice(reader.index, end);

    reader.index = end + 1;

    return value;
};

const readDoubleQuoted = (reader: Reader): NotRequired<string> => {
    let value = '';

    while (reader.index < reader.text.length) {
        const char = reader.text[reader.index] ?? '';
        const nextChar = reader.text[reader.index + 1] ?? '';

        reader.index += 1;

        if (char === '"') {
            return value;
        }

        if (char === '\\' && DOUBLE_QUOTE_ESCAPES.has(nextChar)) {
            value += nextChar;
            reader.index += 1;

            continue;
        }

        value += char;
    }

    return;
};

const readAnsiCEscape = (reader: Reader): string => {
    const rest = reader.text.slice(reader.index);
    const hexMatch = ANSI_C_HEX_RGX.exec(rest);

    if (hexMatch) {
        reader.index += hexMatch[0].length;

        return String.fromCodePoint(Number.parseInt(hexMatch[0].slice(1), 16));
    }

    const char = reader.text[reader.index] ?? '';

    reader.index += 1;

    return ANSI_C_ESCAPES[char] ?? `\\${char}`;
};

const readAnsiCQuoted = (reader: Reader): NotRequired<string> => {
    let value = '';

    while (reader.index < reader.text.length) {
        const char = reader.text[reader.index] ?? '';

        reader.index += 1;

        if (char === "'") {
            return value;
        }

        value += char === '\\' ? readAnsiCEscape(reader) : char;
    }

    return;
};

const readWord = (reader: Reader): NotRequired<string> => {
    let word = '';

    while (reader.index < reader.text.length) {
        const char = reader.text[reader.index] ?? '';
        const nextChar = reader.text[reader.index + 1] ?? '';

        if (WHITESPACE_RGX.test(char)) {
            return word;
        }

        reader.index += 1;

        const quoted = getQuotedPart(reader, char, nextChar);

        if (quoted === null) {
            return;
        }

        word += quoted ?? char;
    }

    return word;
};

const getQuotedPart = (reader: Reader, char: string, nextChar: string): Nullable<NotRequired<string>> => {
    if (char === "'") {
        return readSingleQuoted(reader) ?? null;
    }

    if (char === '"') {
        return readDoubleQuoted(reader) ?? null;
    }

    if (char === '$' && nextChar === "'") {
        reader.index += 1;

        return readAnsiCQuoted(reader) ?? null;
    }

    if (char === '\\' && nextChar !== '') {
        reader.index += 1;

        return nextChar;
    }

    return;
};

export const splitShellWords = (command: string): NotRequired<string[]> => {
    const reader: Reader = { text: command.replace(LINE_CONTINUATION_RGX, ' '), index: 0 };
    const words: string[] = [];

    while (reader.index < reader.text.length) {
        const char = reader.text[reader.index] ?? '';

        if (WHITESPACE_RGX.test(char)) {
            reader.index += 1;

            continue;
        }

        const word = readWord(reader);

        if (word === undefined) {
            return;
        }

        words.push(word);
    }

    return words;
};
