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

export type NoneBody = { readonly bodyType: 'none' };

export type JsonBody = { readonly bodyType: 'json'; readonly text: string };

export type RawBody = { readonly bodyType: 'raw'; readonly text: string; readonly contentType: string };

export type FormBody = { readonly bodyType: 'form'; readonly fields: readonly KeyValue[] };

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

/** fetch() throws when these methods carry a body */
const BODYLESS_METHODS: readonly HttpMethod[] = [HttpMethods.GET, HttpMethods.HEAD];

const REQUEST_ERRORS = {
    BODY_NOT_ALLOWED: 'requests cannot have a body',
} as const;

const getBodyError = (request: ApiRequest): NotRequired<string> => {
    const hasBody = request.body.bodyType !== 'none';

    const isBodylessMethod = BODYLESS_METHODS.includes(request.method);

    if (hasBody && isBodylessMethod) {
        return `${request.method} ${REQUEST_ERRORS.BODY_NOT_ALLOWED}`;
    }

    return;
};

const fields = array(keyValue, { maxLength: 500 });

const requestBody: Validator<RequestBody> = discriminatedUnion('bodyType', {
    none: object({ bodyType: literal('none') }),
    json: object({ bodyType: literal('json'), text: string({ maxLength: MAX_BODY_LENGTH }) }),
    raw: object({
        bodyType: literal('raw'),
        text: string({ maxLength: MAX_BODY_LENGTH }),
        contentType: string({ maxLength: 256 }),
    }),
    form: object({ bodyType: literal('form'), fields }),
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
    getBodyError,
);
