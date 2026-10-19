import { discriminatedUnion, literal, object, refine, string, type Validator } from './validation.ts';

/** URL condition */
export interface UrlPattern {
    /** Syntax of the pattern */
    readonly kind: 'filter' | 'regex';
    /** The pattern itself */
    readonly value: string;
}

/** DNR accepts only printable ASCII in urlFilter */
const URL_FILTER_RGX = /^[\x20-\x7e]+$/;

const NOT_VALID_RGX_ERR = 'is not a valid regular expression';

const compileRgx = (source: string): NotRequired<RegExp> => {
    try {
        return new RegExp(source);
    } catch {
        return undefined;
    }
};

const checkRgx = (value: string): NotRequired<string> =>
    compileRgx(value) === undefined ? NOT_VALID_RGX_ERR : undefined;

export const urlPattern: Validator<UrlPattern> = discriminatedUnion('kind', {
    filter: object({
        kind: literal('filter'),
        value: string({ minLength: 1, maxLength: 2048, pattern: URL_FILTER_RGX }),
    }),
    regex: object({
        kind: literal('regex'),
        value: refine(string({ minLength: 1, maxLength: 2048 }), checkRgx),
    }),
});
