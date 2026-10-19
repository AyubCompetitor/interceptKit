import {
    array,
    boolean,
    discriminatedUnion,
    httpMethod,
    HttpMethods,
    identifier,
    keyValue,
    literal,
    object,
    optional,
    refine,
    string,
    type HttpMethod,
    type KeyValue,
    type Validator,
} from '#shared/lib';

export type NoneBody = { readonly kind: 'none' };

export type JsonBody = { readonly kind: 'json'; readonly text: string };

export type RawBody = { readonly kind: 'raw'; readonly text: string; readonly contentType: string };

export type FormBody = { readonly kind: 'form'; readonly fields: readonly KeyValue[] };

export type RequestBody = NoneBody | JsonBody | RawBody | FormBody;

/** A request built in the API client. Text fields may contain {{variables}} */
export interface ApiRequest {
    /** Unique within the history */
    readonly id: string;
    /** Name shown in the UI */
    readonly name?: string;
    /** HTTP method */
    readonly method: HttpMethod;
    /** Not validated as a URL here: it may contain variables until it is sent */
    readonly url: string;
    /** Query parameters added to the URL */
    readonly query: readonly KeyValue[];
    /** Request headers */
    readonly headers: readonly KeyValue[];
    /** Request body */
    readonly body: RequestBody;
    /** When false the request uses `credentials: 'omit'`: the user's cookies are not sent */
    readonly sendCookies: boolean;
}

export const MAX_BODY_LENGTH = 5_000_000;

const fields = array(keyValue, { maxLength: 500 });

const requestBody: Validator<RequestBody> = discriminatedUnion('kind', {
    none: object({ kind: literal('none') }),
    json: object({ kind: literal('json'), text: string({ maxLength: MAX_BODY_LENGTH }) }),
    raw: object({
        kind: literal('raw'),
        text: string({ maxLength: MAX_BODY_LENGTH }),
        contentType: string({ maxLength: 256 }),
    }),
    form: object({ kind: literal('form'), fields }),
});

export const apiRequestValidator: Validator<ApiRequest> = refine(
    object({
        id: identifier,
        name: optional(string({ maxLength: 200 })),
        method: httpMethod,
        url: string({ maxLength: 8192 }),
        query: fields,
        headers: fields,
        body: requestBody,
        sendCookies: boolean(),
    }),
    request =>
        (request.method === HttpMethods.GET || request.method === HttpMethods.HEAD) && request.body.kind !== 'none'
            ? `${request.method} requests cannot have a body`
            : undefined,
);
