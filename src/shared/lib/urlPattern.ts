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

/** Where a URL filter names its host; the host ends at a port, path, separator or wildcard */
const URL_FILTER_HOST_RGXS = {
    /** ||api.example.com/v1/ */
    DOMAIN_ANCHOR: /^\|\|([^/:^*?|]+)/,
    /** |https://api.example.com/ or https://api.example.com/ */
    SCHEME: /^\|?[a-z][a-z\d+.-]*:\/\/([^/:^*?|]+)/i,
} as const;

const RGX_PATTERN_ERRORS = {
    NOT_VALID: 'is not a valid regular expression',
    LEADING_WILDCARD: 'must not start with ||*, use * instead',
};

/** Anchors of a URL filter; the domain anchor goes first, since it starts like the plain one */
const URL_FILTER_ANCHORS = {
    DOMAIN: '||',
    EDGE: '|',
} as const;

/** URL filter syntax as regular expression sources, by the DNR rules */
const URL_FILTER_SOURCES = {
    /** Start of the host or of any subdomain in it */
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

/** Every character with a meaning in a regular expression, the filter's * and ^ among them */
const RGX_SPECIAL_CHARS_RGX = /[.*+?^${}()|[\]\\/]/g;

/** DNR matches URLs case-insensitively unless a rule asks otherwise */
const URL_PATTERN_RGX_FLAGS = 'i';

const getUrlFilterError = (value: string): NotRequired<string> => {
    const hasLeadingWildcard = value.startsWith('||*');

    if (hasLeadingWildcard) {
        return RGX_PATTERN_ERRORS.LEADING_WILDCARD;
    }

    return;
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

/** Host a URL filter is tied to, such as api.example.com in ||api.example.com/; a regex gives no reliable host */
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

/** The filter's own special characters become their sources, the rest are escaped */
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

/** The pattern as a regular expression that matches URLs the way DNR does, for code that checks URLs itself */
export const buildUrlPatternRgx = (pattern: UrlPattern): RegExp => {
    if (pattern.syntaxType === SyntaxTypes.RGX) {
        return new RegExp(pattern.value, URL_PATTERN_RGX_FLAGS);
    }

    return new RegExp(buildUrlFilterSource(pattern.value), URL_PATTERN_RGX_FLAGS);
};
