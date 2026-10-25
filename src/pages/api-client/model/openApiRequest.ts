import {
    getField,
    getFirstItem,
    getObject,
    getObjects,
    getText,
    getValueText,
    type JsonObject,
} from '../lib/jsonValue.ts';

import { isVariableKey } from '#entities/environment';
import {
    escapeQueryPair,
    isBodylessMethod,
    isSendableMethod,
    parseRawQuery,
    replaceRawQuery,
    RequestBodyTypes,
    type ApiRequest,
    type RequestBody,
} from '#entities/request';
import { getRandomUUID, type KeyValue } from '#shared/lib';

import { addImportGap, ImportGapTypes } from './importGaps.ts';
import { readImportName } from './importNames.ts';
import { resolveRef, resolveRefs, type OpenApiContext } from './openApiRefs.ts';
import { buildSchemaExample, getGivenExample } from './openApiSchema.ts';

/** An operation of the description with the path it belongs to */
export interface OpenApiOperation {
    /** Key of the path, such as /users/{id} */
    readonly path: string;
    /** The method as the description writes it, in lower case */
    readonly method: string;
    /** The path, whose parameters every operation of it shares */
    readonly pathItem: JsonObject;
    /** The operation itself */
    readonly operation: JsonObject;
}

/** A request with the tag that names its folder */
export interface TaggedRequest {
    /** The first tag of the operation; none puts the request at the top of the collection */
    readonly tag: NotRequired<string>;
    /** The request */
    readonly request: ApiRequest;
}

/** What a security scheme adds to a request */
interface AuthParts {
    /** Headers it sets */
    readonly headers: readonly KeyValue[];
    /** Pairs it adds to the query */
    readonly queryPairs: readonly KeyValue[];
}

type SchemeReader = (scheme: JsonObject, token: string, context: OpenApiContext) => AuthParts;

enum ParameterPlaces {
    QUERY = 'query',
    HEADER = 'header',
    COOKIE = 'cookie',
}

enum SchemeTypes {
    API_KEY = 'apiKey',
    HTTP = 'http',
    OAUTH2 = 'oauth2',
    OPEN_ID_CONNECT = 'openIdConnect',
}

type SchemeType = `${SchemeTypes}`;

/** The description sets these headers elsewhere, so a parameter of one of these names is ignored */
const IGNORED_HEADERS: readonly string[] = ['accept', 'content-type', 'authorization'];

const BASE_URL_TEMPLATE = '{{baseUrl}}';

const TOKEN_NAME = 'token';

const AUTHORIZATION_HEADER = 'Authorization';

const BEARER_PREFIX = 'Bearer';

const HTTP_SCHEME_PREFIXES = new Map([
    ['bearer', BEARER_PREFIX],
    ['basic', 'Basic'],
]);

const FORM_TYPE = 'application/x-www-form-urlencoded';

const JSON_INDENT = 4;

const OPENAPI_RGXS = {
    /** {id} in a path */
    PATH_PARAMETER: /\{([^{}]+)\}/g,
    /** application/json, application/problem+json and the like */
    JSON_TYPE: /^application\/([\w.-]+\+)?json\b/i,
    /** Text the client can send as it is */
    TEXT_TYPE: /^(text\/|application\/(xml|javascript)\b|application\/[\w.-]+\+xml\b)/i,
} as const;

const NO_AUTH_PARTS: AuthParts = {
    headers: [],
    queryPairs: [],
};

const NO_BODY: RequestBody = { bodyType: RequestBodyTypes.NONE };

const makePair = (key: string, value: string): KeyValue => ({
    key,
    value,
    enabled: true,
});

/** {id} becomes {{id}}, which the environment fills; a name a template cannot hold stays as it is */
const buildRequestPath = (path: string, context: OpenApiContext): string =>
    path.replace(OPENAPI_RGXS.PATH_PARAMETER, (template, name: string) => {
        if (!isVariableKey(name)) {
            addImportGap(context.gaps, ImportGapTypes.VARIABLE_NAMES, [name]);

            return template;
        }

        return `{{${name}}}`;
    });

const getParameterKey = (parameter: JsonObject): string => `${getText(parameter.in)}:${getText(parameter.name)}`;

/** Parameters of the path go to each of its operations, which override them by place and name */
const mergeParameters = (pathItem: JsonObject, operation: JsonObject, context: OpenApiContext): JsonObject[] => {
    const parameters = new Map<string, JsonObject>();
    const defined = [...resolveRefs(pathItem.parameters, context), ...resolveRefs(operation.parameters, context)];

    for (const parameter of defined) {
        parameters.set(getParameterKey(parameter), parameter);
    }

    return [...parameters.values()];
};

/** The value of the first named example, which may be a reference to the components */
const getFirstExampleValue = (examples: unknown, context: OpenApiContext): unknown => {
    const [firstExample] = Object.values(getObject(examples) ?? {});

    return resolveRef(firstExample, context)?.value;
};

const getParameterValue = (parameter: JsonObject, context: OpenApiContext): string => {
    const value =
        parameter.example ??
        getFirstExampleValue(parameter.examples, context) ??
        getGivenExample(resolveRef(parameter.schema, context));

    return getValueText(value) ?? '';
};

/** A required parameter is switched on, an optional one waits in the table */
const readParameterPair = (parameter: JsonObject, context: OpenApiContext): KeyValue => ({
    key: getText(parameter.name) ?? '',
    value: getParameterValue(parameter, context),
    enabled: parameter.required === true,
});

const isPlacedIn = (parameter: JsonObject, place: ParameterPlaces): boolean => parameter.in === place;

const isHeaderParameter = (parameter: JsonObject): boolean => {
    const name = (getText(parameter.name) ?? '').toLowerCase();

    return isPlacedIn(parameter, ParameterPlaces.HEADER) && !IGNORED_HEADERS.includes(name);
};

const countCookieParameters = (parameters: readonly JsonObject[], context: OpenApiContext) => {
    const names = parameters
        .filter(parameter => isPlacedIn(parameter, ParameterPlaces.COOKIE))
        .map(parameter => getText(parameter.name) ?? '');

    if (!names.length) {
        return;
    }

    addImportGap(context.gaps, ImportGapTypes.COOKIE_PARAMETERS, names, names.length);
};

const readApiKeyScheme: SchemeReader = (scheme, token, context) => {
    const name = getText(scheme.name) ?? '';
    const place = getText(scheme.in);

    if (name === '') {
        return NO_AUTH_PARTS;
    }

    if (place === ParameterPlaces.QUERY) {
        return {
            headers: [],
            queryPairs: [makePair(name, token)],
        };
    }

    if (place === ParameterPlaces.HEADER) {
        return {
            headers: [makePair(name, token)],
            queryPairs: [],
        };
    }

    addImportGap(context.gaps, ImportGapTypes.AUTHS, [`${SchemeTypes.API_KEY} (${place ?? ''})`]);

    return NO_AUTH_PARTS;
};

/** Bearer carries the token, basic carries user:password encoded in Base64, which the user puts into the token */
const readHttpScheme: SchemeReader = (scheme, token, context) => {
    const httpScheme = (getText(scheme.scheme) ?? '').toLowerCase();
    const prefix = HTTP_SCHEME_PREFIXES.get(httpScheme);

    if (prefix === undefined) {
        addImportGap(context.gaps, ImportGapTypes.AUTHS, [`${SchemeTypes.HTTP} ${httpScheme}`]);

        return NO_AUTH_PARTS;
    }

    return {
        headers: [makePair(AUTHORIZATION_HEADER, `${prefix} ${token}`)],
        queryPairs: [],
    };
};

/** OAuth and OpenID Connect end in an access token, which goes as a bearer token */
const readBearerScheme: SchemeReader = (_scheme, token) => ({
    headers: [makePair(AUTHORIZATION_HEADER, `${BEARER_PREFIX} ${token}`)],
    queryPairs: [],
});

const SCHEME_READERS: Readonly<Record<SchemeType, SchemeReader>> = {
    [SchemeTypes.API_KEY]: readApiKeyScheme,
    [SchemeTypes.HTTP]: readHttpScheme,
    [SchemeTypes.OAUTH2]: readBearerScheme,
    [SchemeTypes.OPEN_ID_CONNECT]: readBearerScheme,
};

const isReadableScheme = (schemeType: string): schemeType is SchemeType => Object.hasOwn(SCHEME_READERS, schemeType);

/** One scheme gives {{token}}; with several, each token is named after its scheme so they stay apart */
const getTokenName = (schemeName: string, context: OpenApiContext): string => {
    const isOwnName = !context.isSingleScheme && isVariableKey(schemeName);

    return isOwnName ? schemeName : TOKEN_NAME;
};

const readScheme = (schemeName: string, context: OpenApiContext): AuthParts => {
    const schemes = getObject(getObject(context.document.components)?.securitySchemes);
    const scheme = resolveRef(getField(schemes, schemeName), context);
    const schemeType = getText(scheme?.type) ?? '';

    if (!scheme || !isReadableScheme(schemeType)) {
        addImportGap(context.gaps, ImportGapTypes.AUTHS, [schemeType || schemeName]);

        return NO_AUTH_PARTS;
    }

    const tokenName = getTokenName(schemeName, context);
    const parts = SCHEME_READERS[schemeType](scheme, `{{${tokenName}}}`, context);

    if (parts.headers.length || parts.queryPairs.length) {
        context.tokenNames.add(tokenName);
    }

    return parts;
};

/** The first requirement that asks for anything; each of its schemes is needed at once */
const readSecurity = (operation: JsonObject, context: OpenApiContext): AuthParts => {
    const requirements = getObjects(operation.security ?? context.document.security);
    const requirement = requirements.find(candidate => Object.keys(candidate).length > 0);

    if (!requirement) {
        return NO_AUTH_PARTS;
    }

    const parts = Object.keys(requirement).map(schemeName => readScheme(schemeName, context));

    return {
        headers: parts.flatMap(part => part.headers),
        queryPairs: parts.flatMap(part => part.queryPairs),
    };
};

/** The example of the media type, or of the schema, or empty values in the shape of the schema */
const getMediaExample = (media: JsonObject, context: OpenApiContext): unknown => {
    const givenExample = media.example ?? getFirstExampleValue(media.examples, context);

    if (givenExample !== undefined) {
        return givenExample;
    }

    if (media.schema === undefined) {
        return;
    }

    return buildSchemaExample(media.schema, context);
};

const formatJsonExample = (example: unknown): string => {
    if (example === undefined) {
        return '';
    }

    return getText(example) ?? JSON.stringify(example, null, JSON_INDENT);
};

const readFormFields = (example: unknown): KeyValue[] =>
    Object.entries(getObject(example) ?? {}).map(([key, value]) =>
        makePair(key, getValueText(value) ?? JSON.stringify(value)),
    );

/** JSON goes first, then a form, then text; anything else, such as multipart or binary, is a gap */
const readRequestBody = (value: unknown, context: OpenApiContext): RequestBody => {
    const content = getObject(resolveRef(value, context)?.content) ?? {};
    const mediaTypes = Object.keys(content);
    const jsonType = mediaTypes.find(type => OPENAPI_RGXS.JSON_TYPE.test(type));
    const textType = mediaTypes.find(type => OPENAPI_RGXS.TEXT_TYPE.test(type));
    const getMedia = (type: string): JsonObject => getObject(getField(content, type)) ?? {};

    if (!mediaTypes.length) {
        return NO_BODY;
    }

    if (jsonType !== undefined) {
        return {
            bodyType: RequestBodyTypes.JSON,
            text: formatJsonExample(getMediaExample(getMedia(jsonType), context)),
        };
    }

    if (mediaTypes.includes(FORM_TYPE)) {
        return {
            bodyType: RequestBodyTypes.FORM,
            fields: readFormFields(getMediaExample(getMedia(FORM_TYPE), context)),
        };
    }

    if (textType !== undefined) {
        return {
            bodyType: RequestBodyTypes.RAW,
            text: getText(getMediaExample(getMedia(textType), context)) ?? '',
            contentType: textType,
        };
    }

    addImportGap(context.gaps, ImportGapTypes.BODIES, mediaTypes);

    return NO_BODY;
};

/** A path or an operation may name servers of its own, which the request does not follow */
const isWithOwnServers = (pathItem: JsonObject, operation: JsonObject): boolean =>
    !!getObjects(pathItem.servers).length || !!getObjects(operation.servers).length;

const getRequestName = (operation: JsonObject, method: string, path: string): string =>
    getText(operation.summary) ?? getText(operation.operationId) ?? `${method} ${path}`;

/** A request of the operation; none for a method the API client cannot send */
export const readOpenApiOperation = (
    { path, method, pathItem, operation }: OpenApiOperation,
    context: OpenApiContext,
): NotRequired<TaggedRequest> => {
    const requestMethod = method.toUpperCase();

    if (!isSendableMethod(requestMethod)) {
        addImportGap(context.gaps, ImportGapTypes.METHODS, [requestMethod]);

        return;
    }

    const parameters = mergeParameters(pathItem, operation, context);
    const queryPairs = parameters
        .filter(parameter => isPlacedIn(parameter, ParameterPlaces.QUERY))
        .map(parameter => escapeQueryPair(readParameterPair(parameter, context)));
    const headers = parameters.filter(isHeaderParameter).map(parameter => readParameterPair(parameter, context));
    const auth = readSecurity(operation, context);
    const url = replaceRawQuery(`${BASE_URL_TEMPLATE}${buildRequestPath(path, context)}`, [
        ...queryPairs,
        ...auth.queryPairs.map(escapeQueryPair),
    ]);
    const body = readRequestBody(operation.requestBody, context);
    const isBodyDropped = isBodylessMethod(requestMethod) && body.bodyType !== RequestBodyTypes.NONE;

    countCookieParameters(parameters, context);

    if (isWithOwnServers(pathItem, operation)) {
        addImportGap(context.gaps, ImportGapTypes.OWN_SERVERS);
    }

    if (isBodyDropped) {
        addImportGap(context.gaps, ImportGapTypes.BODIES_OF_BODYLESS, [requestMethod]);
    }

    return {
        tag: getText(getFirstItem(operation.tags)),
        request: {
            id: getRandomUUID(),
            name: readImportName(getRequestName(operation, requestMethod, path), context.unnamed),
            method: requestMethod,
            url,
            query: [...parseRawQuery(url), ...queryPairs.filter(pair => !pair.enabled)],
            headers: [...headers, ...auth.headers],
            body: isBodyDropped ? NO_BODY : body,
            sendCookies: false,
        },
    };
};
