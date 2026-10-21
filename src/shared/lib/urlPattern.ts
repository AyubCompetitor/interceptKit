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
