import { discriminatedUnion, literal, object, refine, string, type Validator } from './validation.ts';

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
