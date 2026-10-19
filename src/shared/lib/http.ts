import { boolean, object, oneOf, refine, string, type Validator } from './validation.ts';

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

const HTTP_PATTERNS = {
    TOKEN: /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/,
    HEADER_VALUE: /^[\t\x20-\x7e\x80-\xff]*$/,
} as const;

const URL_ERRORS = {
    NON_ABSOLUTE: 'expected an absolute URL',
    EXPECT_HTTPS: 'expected an https URL',
}

export const httpMethod = oneOf(HTTP_METHODS);

export const headerName = string({ minLength: 1, maxLength: 256, pattern: HTTP_PATTERNS.TOKEN });

export const headerValue = string({ maxLength: 8192, pattern: HTTP_PATTERNS.HEADER_VALUE });



export const keyValue: Validator<KeyValue> = object({
    key: string({ maxLength: 1024 }),
    value: string({ maxLength: 65_536 }),
    enabled: boolean(),
});

/** An absolute http URL */
export const httpUrl = refine(string({ minLength: 1, maxLength: 8192 }), value => {
    if (!URL.canParse(value)) {
        return URL_ERRORS.NON_ABSOLUTE;
    }

    const { protocol } = new URL(value);

    const isValidProtocol = protocol === Protocols.HTTP || protocol === Protocols.HTTPS;

    if (isValidProtocol) {
        return;
    }

    return URL_ERRORS.EXPECT_HTTPS;
});