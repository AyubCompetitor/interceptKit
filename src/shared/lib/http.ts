import { array, boolean, object, oneOf, refine, string, type Validator } from './validation.ts';

/** Methods the extension can match and send */
export enum HttpMethods {
    GET = 'GET',
    HEAD = 'HEAD',
    POST = 'POST',
    PUT = 'PUT',
    PATCH = 'PATCH',
    DELETE = 'DELETE',
    OPTIONS = 'OPTIONS',
    CONNECT = 'CONNECT',
}

/** URL Protocols */
export enum Protocols {
    HTTP = 'http:',
    HTTPS = 'https:',
}

export type HttpMethod = `${HttpMethods}`;

/** A pair that can be switched off without deleting it (query parameter, header, form field) */
export interface KeyValue {
    /** Name of the pair */
    readonly key: string;
    /** Value of the pair */
    readonly value: string;
    /** Disabled pairs are kept but not sent */
    readonly enabled: boolean;
}

export const HTTP_METHODS = Object.values(HttpMethods);

export const PROTOCOLS: readonly string[] = Object.values(Protocols);

const HTTP_RGXS = {
    TOKEN: /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/,
    HEADER_VALUE: /^[\t\x20-\x7e\x80-\xff]*$/,
} as const;

const URL_ERRORS = {
    NON_ABSOLUTE: 'expected an absolute URL',
    NON_HTTP: 'expected an http(s) URL',
} as const;

export const httpMethod = oneOf(HTTP_METHODS);

/** A non-empty list of methods: DNR rejects empty condition lists */
export const httpMethods = array(httpMethod, { minLength: 1, maxLength: HTTP_METHODS.length });

export const headerName = string({ minLength: 1, maxLength: 256, pattern: HTTP_RGXS.TOKEN });

export const headerValue = string({ maxLength: 8192, pattern: HTTP_RGXS.HEADER_VALUE });

export const keyValue: Validator<KeyValue> = object({
    key: string({ maxLength: 1024 }),
    value: string({ maxLength: 65_536 }),
    enabled: boolean(),
});

/** An absolute http(s) URL */
export const httpUrl = refine(string({ minLength: 1, maxLength: 8192 }), value => {
    if (!URL.canParse(value)) {
        return URL_ERRORS.NON_ABSOLUTE;
    }

    const { protocol } = new URL(value);

    const isValidProtocol = PROTOCOLS.includes(protocol);

    if (isValidProtocol) {
        return;
    }

    return URL_ERRORS.NON_HTTP;
});
