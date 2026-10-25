import {
    array,
    boolean,
    discriminatedUnion,
    HTTP_METHODS,
    HttpMethods,
    identifier,
    keyValue,
    literal,
    MAX_DISPLAY_NAME_LENGTH,
    object,
    oneOf,
    optional,
    refine,
    string,
    type HttpMethod,
    type KeyValue,
    type Validator,
} from '#shared/lib';

export enum RequestBodyTypes {
    NONE = 'none',
    JSON = 'json',
    RAW = 'raw',
    FORM = 'form',
}

export type RequestBodyType = `${RequestBodyTypes}`;

export interface NoneBody {
    /** No body */
    readonly bodyType: RequestBodyTypes.NONE;
}

export interface JsonBody {
    /** A JSON body */
    readonly bodyType: RequestBodyTypes.JSON;
    /** The JSON as typed; may contain {{variables}} */
    readonly text: string;
}

export interface RawBody {
    /** A body of any other type */
    readonly bodyType: RequestBodyTypes.RAW;
    /** The body as typed */
    readonly text: string;
    /** Value of the Content-Type header */
    readonly contentType: string;
}

export interface FormBody {
    /** A URL-encoded form */
    readonly bodyType: RequestBodyTypes.FORM;
    /** Fields of the form */
    readonly fields: readonly KeyValue[];
}

export type RequestBody = NoneBody | JsonBody | RawBody | FormBody;

/** A request built in the API client. Text fields may contain {{variables}} */
export interface ApiRequest {
    /** Unique within the history */
    readonly id: string;
    /** Name shown in the UI */
    readonly name?: string;
    /** HTTP method */
    readonly method: HttpMethod;
    /** Not validated as a URL here: it may contain variables until it is sent; holds the query as typed */
    readonly url: string;
    /** The query of the URL, raw, plus the switched-off parameters that only the table keeps */
    readonly query: readonly KeyValue[];
    /** Request headers */
    readonly headers: readonly KeyValue[];
    /** Request body */
    readonly body: RequestBody;
    /** When false the request uses `credentials: 'omit'`: the user's cookies are not sent */
    readonly sendCookies: boolean;
}

export const MAX_BODY_LENGTH = 5_000_000;

export const SENDABLE_METHODS = HTTP_METHODS.filter(method => method !== HttpMethods.CONNECT);

const BODYLESS_METHODS: readonly HttpMethod[] = [HttpMethods.GET, HttpMethods.HEAD];

const REQUEST_ERRORS = {
    BODY_NOT_ALLOWED: 'requests cannot have a body',
} as const;

export const isBodylessMethod = (method: HttpMethod): boolean => BODYLESS_METHODS.includes(method);

export const isSendableMethod = (value: string): value is HttpMethod =>
    SENDABLE_METHODS.some(method => method === value);

const getBodyError = (request: ApiRequest): NotRequired<string> => {
    const isRequestBodyEmpty = request.body.bodyType === RequestBodyTypes.NONE;

    if (isRequestBodyEmpty || !isBodylessMethod(request.method)) {
        return;
    }

    return `${request.method} ${REQUEST_ERRORS.BODY_NOT_ALLOWED}`;
};

const sendableMethod = oneOf(SENDABLE_METHODS);

const fields = array(keyValue, { maxLength: 500 });

const requestBody: Validator<RequestBody> = discriminatedUnion('bodyType', {
    [RequestBodyTypes.NONE]: object({ bodyType: literal(RequestBodyTypes.NONE) }),
    [RequestBodyTypes.JSON]: object({
        bodyType: literal(RequestBodyTypes.JSON),
        text: string({ maxLength: MAX_BODY_LENGTH }),
    }),
    [RequestBodyTypes.RAW]: object({
        bodyType: literal(RequestBodyTypes.RAW),
        text: string({ maxLength: MAX_BODY_LENGTH }),
        contentType: string({ maxLength: 256 }),
    }),
    [RequestBodyTypes.FORM]: object({ bodyType: literal(RequestBodyTypes.FORM), fields }),
});

export const apiRequestValidator: Validator<ApiRequest> = refine(
    object({
        id: identifier,
        name: optional(string({ maxLength: MAX_DISPLAY_NAME_LENGTH })),
        method: sendableMethod,
        url: string({ maxLength: 8192 }),
        query: fields,
        headers: fields,
        body: requestBody,
        sendCookies: boolean(),
    }),
    getBodyError,
);
