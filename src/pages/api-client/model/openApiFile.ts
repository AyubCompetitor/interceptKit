import {
    getField,
    getFirstItem,
    getObject,
    getObjects,
    getText,
    getValueText,
    type JsonObject,
} from '../lib/jsonValue.ts';

import type { Environment } from '#entities/environment';
import { CollectionItemTypes, createRequestItem, type CollectionItem } from '#entities/request';
import { fail, getRandomUUID, type Result } from '#shared/lib';

import { checkImportedFile, type ImportedFile } from './importedFile.ts';
import { addImportGap, createGapTallies, ImportGapTypes } from './importGaps.ts';
import { buildVariablesName, readImportName, type ImportNames } from './importNames.ts';
import { resolveRef, type OpenApiContext } from './openApiRefs.ts';
import { readOpenApiOperation, type OpenApiOperation, type TaggedRequest } from './openApiRequest.ts';

const VERSION_PATH = '$.openapi';

const OPENAPI_ERRORS = {
    UNKNOWN_VERSION: 'the API client reads OpenAPI 3.0 and 3.1 only',
} as const;

const OPERATION_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

const BASE_URL_KEY = 'baseUrl';

/** Keys of paths begin with /; others, such as x-…, are extensions of the specification */
const PATH_START = '/';

/** Without servers the description is served from where it lies, which the spec writes as / */
const DEFAULT_SERVER_URL = '/';

const OPENAPI_RGXS = {
    VERSION: /^3\.[01]\./,
    /** {port} in the URL of a server */
    SERVER_VARIABLE: /\{([^{}]+)\}/g,
    ABSOLUTE_URL: /^https?:\/\//i,
    TRAILING_SLASH: /\/+$/,
} as const;

/** The first server with its variables at their defaults; paths begin with /, so the address ends without one */
const readBaseUrl = (document: JsonObject, context: OpenApiContext): string => {
    const server = getObject(getFirstItem(document.servers));
    const variables = getObject(server?.variables);
    const serverUrl = getText(server?.url) ?? DEFAULT_SERVER_URL;
    const getDefault = (name: string): NotRequired<string> =>
        getValueText(getObject(getField(variables, name))?.default);
    const filledUrl = serverUrl.replace(
        OPENAPI_RGXS.SERVER_VARIABLE,
        (template, name: string) => getDefault(name) ?? template,
    );

    if (!OPENAPI_RGXS.ABSOLUTE_URL.test(filledUrl)) {
        addImportGap(context.gaps, ImportGapTypes.RELATIVE_SERVER, [filledUrl]);
    }

    return filledUrl.replace(OPENAPI_RGXS.TRAILING_SLASH, '');
};

const listOperations = (document: JsonObject, context: OpenApiContext): OpenApiOperation[] => {
    const operations: OpenApiOperation[] = [];

    for (const [path, value] of Object.entries(getObject(document.paths) ?? {})) {
        if (!path.startsWith(PATH_START)) {
            continue;
        }

        const pathItem = resolveRef(value, context);

        for (const method of OPERATION_METHODS) {
            const operation = getObject(getField(pathItem, method));

            if (pathItem && operation) {
                operations.push({ path, method, pathItem, operation });
            }
        }
    }

    return operations;
};

const readRequests = (document: JsonObject, context: OpenApiContext): TaggedRequest[] => {
    const requests: TaggedRequest[] = [];

    for (const operation of listOperations(document, context)) {
        const request = readOpenApiOperation(operation, context);

        if (request) {
            requests.push(request);
        }
    }

    return requests;
};

/** A folder for each tag, in the order the description lists its tags; requests without a tag go to the top */
const groupByTag = (requests: readonly TaggedRequest[], document: JsonObject, unnamed: string): CollectionItem[] => {
    const folders = new Map<string, CollectionItem[]>();
    const untagged: CollectionItem[] = [];

    for (const tag of getObjects(document.tags)) {
        folders.set(getText(tag.name) ?? '', []);
    }

    for (const { tag, request } of requests) {
        if (tag === undefined) {
            untagged.push(createRequestItem(request));

            continue;
        }

        const items = folders.get(tag) ?? [];

        items.push(createRequestItem(request));
        folders.set(tag, items);
    }

    const folderItems: CollectionItem[] = [];

    for (const [name, items] of folders) {
        if (!items.length) {
            continue;
        }

        folderItems.push({
            itemType: CollectionItemTypes.FOLDER,
            id: getRandomUUID(),
            name: readImportName(name, unnamed),
            items,
        });
    }

    return [...folderItems, ...untagged];
};

/** baseUrl holds the server, and each token the requests use waits as an empty secret */
const buildEnvironment = (
    collectionName: string,
    baseUrl: string,
    context: OpenApiContext,
    names: ImportNames,
): Environment => {
    const tokens = [...context.tokenNames].map(key => ({
        key,
        value: '',
        enabled: true,
        secret: true,
    }));

    return {
        id: getRandomUUID(),
        name: buildVariablesName(collectionName, names),
        variables: [{ key: BASE_URL_KEY, value: baseUrl, enabled: true, secret: false }, ...tokens],
    };
};

/** An OpenAPI 3.0 or 3.1 description: the operations become requests, the server and tokens an environment */
export const readOpenApiFile = (file: JsonObject, names: ImportNames): Result<ImportedFile> => {
    const version = getText(file.openapi) ?? '';

    if (!OPENAPI_RGXS.VERSION.test(version)) {
        return fail(VERSION_PATH, OPENAPI_ERRORS.UNKNOWN_VERSION);
    }

    const gaps = createGapTallies();
    const schemes = getObject(getObject(file.components)?.securitySchemes) ?? {};

    const context: OpenApiContext = {
        document: file,
        gaps,
        tokenNames: new Set(),
        isSingleScheme: Object.keys(schemes).length === 1,
        unnamed: names.unnamed,
    };

    const baseUrl = readBaseUrl(file, context);
    const requests = readRequests(file, context);
    const name = readImportName(getObject(file.info)?.title, names.unnamed);

    const collection = {
        id: getRandomUUID(),
        name,
        createdAt: 0,
        items: groupByTag(requests, file, names.unnamed),
    };

    return checkImportedFile({ collection, environment: buildEnvironment(name, baseUrl, context, names) }, gaps);
};
