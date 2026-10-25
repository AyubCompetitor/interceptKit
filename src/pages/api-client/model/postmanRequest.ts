import { getObject, getObjects, getText, getValueText, type JsonObject } from '../lib/jsonValue.ts';

import {
    appendRawQuery,
    encodeQueryPair,
    isBodylessMethod,
    isSendableMethod,
    parseRawQuery,
    replaceRawQuery,
    RequestBodyTypes,
    type ApiRequest,
    type RequestBody,
} from '#entities/request';
import { encodeBase64, getRandomUUID, HttpMethods, type KeyValue } from '#shared/lib';

import { addImportGap, ImportGapTypes, type ImportGapTallies } from './importGaps.ts';
import { readImportName } from './importNames.ts';

/** What a request takes from the folders and the collection around it */
export interface PostmanContext {
    /** Authorization of the nearest folder, or of the collection, that sets one */
    readonly auth: NotRequired<JsonObject>;
    /** Where the gaps of the file are counted */
    readonly gaps: ImportGapTallies;
    /** Name for an item without one */
    readonly unnamed: string;
}

interface PostmanUrl {
    /** The URL with its query, as Postman writes it */
    readonly url: string;
    /** Parameters switched off in Postman: they stay in the table only */
    readonly disabledQuery: readonly KeyValue[];
}

/** What an authorization adds to a request */
interface AuthParts {
    /** Headers it sets */
    readonly headers: readonly KeyValue[];
    /** Raw pairs it adds to the query */
    readonly queryParts: readonly string[];
}

enum PostmanAuthTypes {
    BEARER = 'bearer',
    API_KEY = 'apikey',
    BASIC = 'basic',
    NO_AUTH = 'noauth',
}

type PostmanAuthType = `${PostmanAuthTypes}`;

type AuthReader = (params: ReadonlyMap<string, string>, gaps: ImportGapTallies) => AuthParts;

enum PostmanBodyModes {
    RAW = 'raw',
    URLENCODED = 'urlencoded',
}

/** Postman writes no auth, or this type, for a request that takes the authorization of its folder */
const INHERITED_AUTH = 'inherit';

const AUTHORIZATION_HEADER = 'Authorization';

const CONTENT_TYPE_HEADER = 'content-type';

const API_KEY_IN_QUERY = 'query';

const DEFAULT_RAW_TYPE = 'text/plain';

const RAW_CONTENT_TYPES = new Map([
    ['text', DEFAULT_RAW_TYPE],
    ['javascript', 'application/javascript'],
    ['html', 'text/html'],
    ['xml', 'application/xml'],
]);

const POSTMAN_RGXS = {
    /** A :name segment of the path, which Postman fills from the variables of the URL */
    PATH_VARIABLE: /(?<=\/):([A-Za-z_][\w.-]*)/g,
    /** The query or the fragment, where :name is not a variable */
    PATH_END: /[?#]/,
    /** {{$guid}}, {{$timestamp}} and other values Postman makes up at sending */
    DYNAMIC_VARIABLE: /\{\{\$[A-Za-z]+\}\}/g,
    TEMPLATE: /\{\{[^{}]*\}\}/,
    JSON_TYPE: /json/i,
} as const;

const URL_MARKS = {
    SCHEME: '://',
    PORT: ':',
    PATH: '/',
    HOST: '.',
    FRAGMENT: '#',
} as const;

const HEADER_MARKS = {
    LINE: '\n',
    VALUE: ':',
} as const;

const NO_AUTH_PARTS: AuthParts = {
    headers: [],
    queryParts: [],
};

const NO_BODY: RequestBody = { bodyType: RequestBodyTypes.NONE };

const makePair = (key: string, value: string): KeyValue => ({
    key,
    value,
    enabled: true,
});

/** Parts of a host or a path, as a string or a list of strings and { value } objects */
const joinUrlParts = (value: unknown, separator: string): string => {
    if (!Array.isArray(value)) {
        return getText(value) ?? '';
    }

    return value.map(part => getText(part) ?? getText(getObject(part)?.value) ?? '').join(separator);
};

const readPair = (pair: JsonObject): KeyValue => ({
    key: getText(pair.key) ?? '',
    value: getValueText(pair.value) ?? '',
    enabled: pair.disabled !== true,
});

/** Old exports may have no raw URL: it is put together from its parts */
const buildUrlFromParts = (url: JsonObject): string => {
    const protocol = getText(url.protocol);
    const port = getText(url.port);
    const path = joinUrlParts(url.path, URL_MARKS.PATH);
    const hash = getText(url.hash);

    const scheme = protocol ? `${protocol}${URL_MARKS.SCHEME}` : '';
    const portPart = port ? `${URL_MARKS.PORT}${port}` : '';
    const pathPart = path ? `${URL_MARKS.PATH}${path}` : '';
    const hashPart = hash ? `${URL_MARKS.FRAGMENT}${hash}` : '';
    const base = `${scheme}${joinUrlParts(url.host, URL_MARKS.HOST)}${portPart}${pathPart}${hashPart}`;

    return replaceRawQuery(base, getObjects(url.query).map(readPair));
};

const readPathValues = (variables: unknown): Map<string, string> => {
    const values = new Map<string, string>();

    for (const variable of getObjects(variables)) {
        const key = getText(variable.key);
        const value = getValueText(variable.value) ?? '';

        if (key !== undefined && value !== '') {
            values.set(key, value);
        }
    }

    return values;
};

/** :id becomes the value Postman would send; a variable without a value stays as typed */
const fillPathVariables = (url: string, values: ReadonlyMap<string, string>): string => {
    const pathEnd = url.search(POSTMAN_RGXS.PATH_END);
    const splitAt = pathEnd === -1 ? url.length : pathEnd;
    const path = url.slice(0, splitAt);
    const filledPath = path.replace(POSTMAN_RGXS.PATH_VARIABLE, (match, name: string) => values.get(name) ?? match);

    return `${filledPath}${url.slice(splitAt)}`;
};

const readUrl = (value: unknown): PostmanUrl => {
    const url = getObject(value);

    if (!url) {
        return {
            url: getText(value) ?? '',
            disabledQuery: [],
        };
    }

    const rawUrl = getText(url.raw) ?? buildUrlFromParts(url);
    const query = getObjects(url.query).map(readPair);

    return {
        url: fillPathVariables(rawUrl, readPathValues(url.variable)),
        disabledQuery: query.filter(pair => !pair.enabled),
    };
};

const readHeaderLine = (line: string): NotRequired<KeyValue> => {
    const separatorIdx = line.indexOf(HEADER_MARKS.VALUE);

    if (separatorIdx <= 0) {
        return;
    }

    return makePair(line.slice(0, separatorIdx).trim(), line.slice(separatorIdx + 1).trim());
};

/** A list of headers, or the text of them that old exports write */
const readHeaders = (value: unknown): KeyValue[] => {
    const text = getText(value);

    if (text === undefined) {
        return getObjects(value)
            .filter(header => getText(header.key) !== undefined)
            .map(readPair);
    }

    const headers: KeyValue[] = [];

    for (const line of text.split(HEADER_MARKS.LINE)) {
        const header = readHeaderLine(line);

        if (header) {
            headers.push(header);
        }
    }

    return headers;
};

const isHeaderSet = (headers: readonly KeyValue[], name: string): boolean =>
    headers.some(header => header.enabled && header.key.toLowerCase() === name.toLowerCase());

/** The authorization a folder or a request sets for itself; none means the one around it */
export const readAuth = (value: unknown): NotRequired<JsonObject> => {
    const auth = getObject(value);
    const authType = getText(auth?.type);

    if (authType === undefined || authType === INHERITED_AUTH) {
        return;
    }

    return auth;
};

/** v2.1 lists the parameters as { key, value }, v2.0 keeps them in an object */
const getAuthParams = (auth: JsonObject, authType: string): Map<string, string> => {
    const params = auth[authType];
    const values = new Map<string, string>();

    for (const param of getObjects(params)) {
        const key = getText(param.key);
        const value = getValueText(param.value);

        if (key !== undefined && value !== undefined) {
            values.set(key, value);
        }
    }

    for (const [key, value] of Object.entries(getObject(params) ?? {})) {
        const text = getValueText(value);

        if (text !== undefined) {
            values.set(key, text);
        }
    }

    return values;
};

const readBearerAuth: AuthReader = params => ({
    headers: [makePair(AUTHORIZATION_HEADER, `Bearer ${params.get('token') ?? ''}`)],
    queryParts: [],
});

const readApiKeyAuth: AuthReader = params => {
    const key = params.get('key') ?? '';
    const value = params.get('value') ?? '';

    if (key === '') {
        return NO_AUTH_PARTS;
    }

    if (params.get('in') === API_KEY_IN_QUERY) {
        return {
            headers: [],
            queryParts: [encodeQueryPair(makePair(key, value))],
        };
    }

    return {
        headers: [makePair(key, value)],
        queryParts: [],
    };
};

/** The header holds the credentials encoded, so a {{variable}} inside could never be filled */
const readBasicAuth: AuthReader = (params, gaps) => {
    const credentials = `${params.get('username') ?? ''}:${params.get('password') ?? ''}`;

    if (POSTMAN_RGXS.TEMPLATE.test(credentials)) {
        addImportGap(gaps, ImportGapTypes.BASIC_WITH_VARIABLES);

        return NO_AUTH_PARTS;
    }

    const encoded = encodeBase64(new TextEncoder().encode(credentials));

    return {
        headers: [makePair(AUTHORIZATION_HEADER, `Basic ${encoded}`)],
        queryParts: [],
    };
};

const AUTH_READERS: Readonly<Record<PostmanAuthType, AuthReader>> = {
    [PostmanAuthTypes.BEARER]: readBearerAuth,
    [PostmanAuthTypes.API_KEY]: readApiKeyAuth,
    [PostmanAuthTypes.BASIC]: readBasicAuth,
    [PostmanAuthTypes.NO_AUTH]: () => NO_AUTH_PARTS,
};

const isReadableAuth = (authType: string): authType is PostmanAuthType => Object.hasOwn(AUTH_READERS, authType);

const readAuthParts = (auth: NotRequired<JsonObject>, gaps: ImportGapTallies): AuthParts => {
    const authType = getText(auth?.type);

    if (!auth || authType === undefined) {
        return NO_AUTH_PARTS;
    }

    if (!isReadableAuth(authType)) {
        addImportGap(gaps, ImportGapTypes.AUTHS, [authType]);

        return NO_AUTH_PARTS;
    }

    return AUTH_READERS[authType](getAuthParams(auth, authType), gaps);
};

const getContentType = (headers: readonly KeyValue[]): NotRequired<string> =>
    headers.find(header => header.enabled && header.key.toLowerCase() === CONTENT_TYPE_HEADER)?.value;

const readRawBody = (body: JsonObject, headers: readonly KeyValue[]): RequestBody => {
    const text = getText(body.raw) ?? '';
    const language = getText(getObject(getObject(body.options)?.raw)?.language);
    const contentType = getContentType(headers);

    if (text === '') {
        return NO_BODY;
    }

    const isJson = language === 'json' || (language === undefined && POSTMAN_RGXS.JSON_TYPE.test(contentType ?? ''));

    if (isJson) {
        return {
            bodyType: RequestBodyTypes.JSON,
            text,
        };
    }

    return {
        bodyType: RequestBodyTypes.RAW,
        text,
        contentType: contentType ?? RAW_CONTENT_TYPES.get(language ?? '') ?? DEFAULT_RAW_TYPE,
    };
};

const readFormBody = (body: JsonObject): RequestBody => {
    const fields = getObjects(body.urlencoded)
        .filter(field => getText(field.key) !== undefined)
        .map(readPair);

    if (!fields.length) {
        return NO_BODY;
    }

    return {
        bodyType: RequestBodyTypes.FORM,
        fields,
    };
};

/** Requests that have no body often keep an empty one of another mode: that is no loss */
const isBodyContentEmpty = (content: unknown): boolean => {
    if (Array.isArray(content)) {
        return !content.length;
    }

    const values = Object.values(getObject(content) ?? {});

    return values.every(value => value === null || value === '');
};

const readBody = (value: unknown, headers: readonly KeyValue[], gaps: ImportGapTallies): RequestBody => {
    const body = getObject(value);
    const mode = getText(body?.mode);

    if (!body || mode === undefined || body.disabled === true) {
        return NO_BODY;
    }

    if (mode === PostmanBodyModes.RAW) {
        return readRawBody(body, headers);
    }

    if (mode === PostmanBodyModes.URLENCODED) {
        return readFormBody(body);
    }

    if (!isBodyContentEmpty(body[mode])) {
        addImportGap(gaps, ImportGapTypes.BODIES, [mode]);
    }

    return NO_BODY;
};

const countDynamicVariables = (request: ApiRequest, gaps: ImportGapTallies) => {
    const names = JSON.stringify(request).match(POSTMAN_RGXS.DYNAMIC_VARIABLE);

    if (!names) {
        return;
    }

    addImportGap(gaps, ImportGapTypes.DYNAMIC_VARIABLES, names);
};

/** A request of the collection; none for a method the API client cannot send */
export const readPostmanRequest = (item: JsonObject, context: PostmanContext): NotRequired<ApiRequest> => {
    const request: JsonObject = getObject(item.request) ?? { url: item.request };
    const method = (getText(request.method) ?? HttpMethods.GET).toUpperCase();

    if (!isSendableMethod(method)) {
        addImportGap(context.gaps, ImportGapTypes.METHODS, [method]);

        return;
    }

    const { url, disabledQuery } = readUrl(request.url);
    const auth = readAuthParts(readAuth(request.auth) ?? context.auth, context.gaps);
    const headers = readHeaders(request.header);
    const authHeaders = auth.headers.filter(header => !isHeaderSet(headers, header.key));
    const fullUrl = appendRawQuery(url, auth.queryParts);
    const body = readBody(request.body, headers, context.gaps);
    const isBodyDropped = isBodylessMethod(method) && body.bodyType !== RequestBodyTypes.NONE;

    if (isBodyDropped) {
        addImportGap(context.gaps, ImportGapTypes.BODIES_OF_BODYLESS, [method]);
    }

    const apiRequest: ApiRequest = {
        id: getRandomUUID(),
        name: readImportName(item.name, context.unnamed),
        method,
        url: fullUrl,
        query: [...parseRawQuery(fullUrl), ...disabledQuery],
        headers: [...headers, ...authHeaders],
        body: isBodyDropped ? NO_BODY : body,
        sendCookies: false,
    };

    countDynamicVariables(apiRequest, context.gaps);

    return apiRequest;
};
