import { domainName } from './identifier.ts';
import { discriminatedUnion, literal, object, refine, string, validate, type Validator } from './validation.ts';

export enum SyntaxTypes {
    FILTER = 'filter',
    RGX = 'regex',
}

/** URL condition */
export interface UrlPattern {
    /** Syntax of the pattern */
    readonly syntaxType: `${SyntaxTypes}`;
    /** The pattern itself */
    readonly value: string;
}

const URL_FILTER_RGX = /^[\x20-\x7e]+$/;

const URL_FILTER_HOST_RGXS = {
    DOMAIN_ANCHOR: /^\|\|([^/:^*?|]+)/,
    SCHEME: /^\|?[a-z][a-z\d+.-]*:\/\/([^/:^*?|]+)/i,
} as const;

const RGX_PATTERN_ERRORS = {
    NOT_VALID: 'is not a valid regular expression',
    LEADING_WILDCARD: 'must not start with ||*, use * instead',
};

const URL_FILTER_ANCHORS = {
    DOMAIN: '||',
    EDGE: '|',
} as const;

const URL_FILTER_SOURCES = {
    DOMAIN_ANCHOR: '^[a-z][a-z\\d+.-]*://(?:[^/?#]*\\.)?',
    START: '^',
    END: '$',
    WILDCARD: '.*',
    /** Anything but a letter, a digit, _ - . % — or the end of the URL */
    SEPARATOR: '(?:[^\\w\\-.%]|$)',
} as const;

const URL_FILTER_SPECIAL_CHARS: Readonly<Record<string, string>> = {
    '*': URL_FILTER_SOURCES.WILDCARD,
    '^': URL_FILTER_SOURCES.SEPARATOR,
};

const RGX_SPECIAL_CHARS_RGX = /[.*+?^${}()|[\]\\/]/g;

const URL_PATTERN_RGX_FLAGS = 'i';

const getUrlFilterError = (value: string): NotRequired<string> => {
    const isLeadingWildcard = value.startsWith('||*');

    if (!isLeadingWildcard) {
        return;
    }

    return RGX_PATTERN_ERRORS.LEADING_WILDCARD;
};

const isValidRgx = (source: string): boolean => {
    try {
        return !!new RegExp(source);
    } catch {
        return false;
    }
};

const getRgxError = (value: string): NotRequired<string> => {
    if (isValidRgx(value)) {
        return;
    }

    return RGX_PATTERN_ERRORS.NOT_VALID;
};

export const getPatternHost = (pattern: UrlPattern): NotRequired<string> => {
    if (pattern.syntaxType === SyntaxTypes.RGX) {
        return;
    }

    const domainMatch = URL_FILTER_HOST_RGXS.DOMAIN_ANCHOR.exec(pattern.value);
    const match = domainMatch ?? URL_FILTER_HOST_RGXS.SCHEME.exec(pattern.value);
    const host = match?.[1]?.toLowerCase();

    if (host === undefined) {
        return;
    }

    const isValidHost = validate(domainName, host).ok;

    if (!isValidHost) {
        return;
    }

    return host;
};

export const urlPattern: Validator<UrlPattern> = discriminatedUnion('syntaxType', {
    filter: object({
        syntaxType: literal('filter'),
        value: refine(
            string({
                minLength: 1,
                maxLength: 2048,
                pattern: URL_FILTER_RGX,
            }),
            getUrlFilterError,
        ),
    }),
    regex: object({
        syntaxType: literal('regex'),
        value: refine(
            string({
                minLength: 1,
                maxLength: 2048,
            }),
            getRgxError,
        ),
    }),
});

const START_ANCHORS = [
    { anchor: URL_FILTER_ANCHORS.DOMAIN, source: URL_FILTER_SOURCES.DOMAIN_ANCHOR },
    { anchor: URL_FILTER_ANCHORS.EDGE, source: URL_FILTER_SOURCES.START },
] as const;

const mapSpecialCharToRgx = (char: string): string => {
    const filterSource = URL_FILTER_SPECIAL_CHARS[char];

    if (filterSource !== undefined) {
        return filterSource;
    }

    return `\\${char}`;
};

const buildUrlFilterSource = (filter: string): string => {
    const startAnchor = START_ANCHORS.find(({ anchor }) => filter.startsWith(anchor));
    const afterStart = filter.slice(startAnchor?.anchor.length ?? 0);

    const isEndAnchored = afterStart.endsWith(URL_FILTER_ANCHORS.EDGE);
    const body = isEndAnchored ? afterStart.slice(0, -1) : afterStart;

    const startSource = startAnchor?.source ?? '';
    const bodySource = body.replace(RGX_SPECIAL_CHARS_RGX, mapSpecialCharToRgx);
    const endSource = isEndAnchored ? URL_FILTER_SOURCES.END : '';

    return startSource + bodySource + endSource;
};

export const buildUrlPatternRgx = (pattern: UrlPattern): RegExp => {
    if (pattern.syntaxType === SyntaxTypes.RGX) {
        return new RegExp(pattern.value, URL_PATTERN_RGX_FLAGS);
    }

    return new RegExp(buildUrlFilterSource(pattern.value), URL_PATTERN_RGX_FLAGS);
};
