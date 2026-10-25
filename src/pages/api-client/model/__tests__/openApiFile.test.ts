import { describe, expect, it } from '@rstest/core';

import { isFolderItem, RequestBodyTypes, type ApiRequest, type CollectionItem } from '#entities/request';
import { HttpMethods } from '#shared/lib';

import type { ImportedFile } from '../importedFile.ts';
import { parseImportFile } from '../importFile.ts';
import { ImportGapTypes } from '../importGaps.ts';

const NAMES = {
    unnamed: 'Untitled',
    variablesSuffix: ': variables',
};

const PET_SCHEMA = {
    type: 'object',
    required: ['name'],
    properties: {
        id: { type: 'integer', format: 'int64' },
        name: { type: 'string', example: 'Rex' },
        tags: { type: 'array', items: { type: 'string' } },
        owner: { $ref: '#/components/schemas/Owner' },
        status: { type: ['string', 'null'], enum: ['available', 'sold'] },
    },
};

const makeDescription = (overrides: object = {}) => ({
    openapi: '3.1.0',
    info: { title: 'Pet Store', version: '1.0.0' },
    servers: [{ url: 'https://{region}.pets.example.com/v1/', variables: { region: { default: 'eu' } } }],
    tags: [{ name: 'pets' }, { name: 'unused' }],
    paths: {},
    components: {
        schemas: {
            Pet: PET_SCHEMA,
            Owner: { type: 'object', properties: { email: { type: 'string', format: 'email' } } },
        },
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
    },
    security: [{ bearerAuth: [] }],
    ...overrides,
});

const readImport = (description: object): ImportedFile => {
    const result = parseImportFile(JSON.stringify(description), NAMES);

    if (!result.ok) {
        throw new Error(result.issues.map(issue => `${issue.path}: ${issue.message}`).join('; '));
    }

    return result.value;
};

const collectRequests = (items: readonly CollectionItem[]): ApiRequest[] =>
    items.flatMap(item => (isFolderItem(item) ? collectRequests(item.items) : [item.request]));

const readRequests = (paths: object, overrides: object = {}): ApiRequest[] =>
    collectRequests(readImport(makeDescription({ paths, ...overrides })).collection?.items ?? []);

const readRequest = (paths: object, overrides: object = {}): ApiRequest => {
    const [request] = readRequests(paths, overrides);

    if (!request) {
        throw new Error('expected a request');
    }

    return request;
};

const postPet = (requestBody: object) => ({ '/pets': { post: { summary: 'Add a pet', requestBody } } });

const readGaps = (description: object) =>
    readImport(description).gaps.map(gap => [gap.gapType, gap.details, gap.count]);

describe('an OpenAPI description', () => {
    const description = makeDescription({
        paths: {
            '/pets/{petId}': {
                parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'integer' } }],
                get: {
                    tags: ['pets'],
                    summary: 'Get a pet',
                    parameters: [
                        { $ref: '#/components/parameters/Fields' },
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'X-Trace', in: 'header', required: true, example: 'abc' },
                        { name: 'Accept', in: 'header', required: true, example: 'text/html' },
                    ],
                },
            },
            '/health': { get: { operationId: 'checkHealth', security: [] } },
        },
        components: {
            ...makeDescription().components,
            parameters: { Fields: { name: 'fields', in: 'query', required: true, example: 'name,id' } },
        },
    });

    const { collection, environment, gaps } = readImport(description);

    it('puts the operations of a tag into its folder and the others at the top', () => {
        expect(collection?.name).toBe('Pet Store');

        expect(collection?.items.map(item => (isFolderItem(item) ? item.name : item.request.name))).toEqual([
            'pets',
            'checkHealth',
        ]);
    });

    it('reads a request with path, query and header parameters and the token of the description', () => {
        const [request] = collectRequests(collection?.items ?? []);

        expect(request).toMatchObject({
            name: 'Get a pet',
            method: HttpMethods.GET,
            url: '{{baseUrl}}/pets/{{petId}}?fields=name,id',
            query: [
                { key: 'fields', value: 'name,id', enabled: true },
                { key: 'page', value: '1', enabled: false },
            ],
            headers: [
                { key: 'X-Trace', value: 'abc', enabled: true },
                { key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
            ],
            body: { bodyType: RequestBodyTypes.NONE },
        });
    });

    it('sends nothing for authorization where the operation turns it off', () => {
        const requests = collectRequests(collection?.items ?? []);

        expect(requests[1]?.headers).toEqual([]);
    });

    it('makes an environment of the server and the token', () => {
        expect(environment).toMatchObject({
            name: 'Pet Store: variables',
            variables: [
                { key: 'baseUrl', value: 'https://eu.pets.example.com/v1', enabled: true, secret: false },
                { key: 'token', value: '', enabled: true, secret: true },
            ],
        });

        expect(gaps).toEqual([]);
    });
});

describe('the body of an operation', () => {
    it('fills JSON from the schema, following references', () => {
        const request = readRequest(
            postPet({ content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } }),
        );
        const body = request.body.bodyType === RequestBodyTypes.JSON ? JSON.parse(request.body.text) : undefined;

        expect(body).toEqual({ id: 0, name: 'Rex', tags: [''], owner: { email: '' }, status: 'available' });
    });

    it.each([
        {
            name: 'the example of the media type',
            content: { 'application/json': { example: { name: 'Tom' }, schema: PET_SCHEMA } },
            expected: { bodyType: RequestBodyTypes.JSON, text: '{\n    "name": "Tom"\n}' },
        },
        {
            name: 'the first of the named examples',
            content: { 'application/vnd.api+json': { examples: { cat: { value: { name: 'Kit' } } } } },
            expected: { bodyType: RequestBodyTypes.JSON, text: '{\n    "name": "Kit"\n}' },
        },
        {
            name: 'a URL-encoded form',
            content: { 'application/x-www-form-urlencoded': { example: { name: 'Rex', age: 3 } } },
            expected: {
                bodyType: RequestBodyTypes.FORM,
                fields: [
                    { key: 'name', value: 'Rex', enabled: true },
                    { key: 'age', value: '3', enabled: true },
                ],
            },
        },
        {
            name: 'XML text',
            content: { 'application/xml': { example: '<pet/>' } },
            expected: { bodyType: RequestBodyTypes.RAW, text: '<pet/>', contentType: 'application/xml' },
        },
    ])('reads $name', ({ content, expected }) => {
        expect(readRequest(postPet({ content })).body).toEqual(expected);
    });

    it('leaves out a multipart body and says so', () => {
        const description = makeDescription({
            paths: postPet({ content: { 'multipart/form-data': { schema: PET_SCHEMA } } }),
        });

        expect(readGaps(description)).toEqual([[ImportGapTypes.BODIES, ['multipart/form-data'], 1]]);
    });
});

describe('security schemes', () => {
    const getPets = { '/pets': { get: { summary: 'List pets' } } };

    it.each([
        {
            name: 'an API key in a header',
            scheme: { type: 'apiKey', name: 'X-Api-Key', in: 'header' },
            headers: [{ key: 'X-Api-Key', value: '{{token}}', enabled: true }],
        },
        {
            name: 'basic credentials',
            scheme: { type: 'http', scheme: 'Basic' },
            headers: [{ key: 'Authorization', value: 'Basic {{token}}', enabled: true }],
        },
        {
            name: 'OAuth 2.0',
            scheme: { type: 'oauth2', flows: {} },
            headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
        },
    ])('turn $name into a header', ({ scheme, headers }) => {
        const components = { securitySchemes: { auth: scheme } };

        expect(readRequest(getPets, { components, security: [{ auth: [] }] }).headers).toEqual(headers);
    });

    it('put an API key for the query into the URL', () => {
        const components = { securitySchemes: { auth: { type: 'apiKey', name: 'api_key', in: 'query' } } };

        expect(readRequest(getPets, { components, security: [{ auth: [] }] }).url).toBe(
            '{{baseUrl}}/pets?api_key={{token}}',
        );
    });

    it('name each token after its scheme when there are several', () => {
        const components = {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer' },
                apiKey: { type: 'apiKey', name: 'X-Api-Key', in: 'header' },
            },
        };
        const description = makeDescription({ paths: getPets, components, security: [{ bearerAuth: [], apiKey: [] }] });

        expect(readImport(description).environment?.variables.map(variable => variable.key)).toEqual([
            'baseUrl',
            'bearerAuth',
            'apiKey',
        ]);
    });

    it.each([
        {
            name: 'an API key in a cookie',
            scheme: { type: 'apiKey', name: 'session', in: 'cookie' },
            detail: 'apiKey (cookie)',
        },
        { name: 'digest', scheme: { type: 'http', scheme: 'digest' }, detail: 'http digest' },
        { name: 'mutual TLS', scheme: { type: 'mutualTLS' }, detail: 'mutualTLS' },
    ])('leave out $name and say so', ({ scheme, detail }) => {
        const description = makeDescription({
            paths: getPets,
            components: { securitySchemes: { auth: scheme } },
            security: [{ auth: [] }],
        });

        expect(readGaps(description)).toEqual([[ImportGapTypes.AUTHS, [detail], 1]]);
    });
});

describe('what the client cannot carry over', () => {
    it('names a server address that is not a full URL', () => {
        const description = makeDescription({ servers: [{ url: '/api/' }] });

        expect(readImport(description).environment?.variables[0]?.value).toBe('/api');

        expect(readGaps(description)).toEqual([[ImportGapTypes.RELATIVE_SERVER, ['/api/'], 1]]);
    });

    it('takes / as the server when the description has none', () => {
        expect(readGaps(makeDescription({ servers: undefined }))).toEqual([[ImportGapTypes.RELATIVE_SERVER, ['/'], 1]]);
    });

    it.each([
        {
            name: 'a reference to another file',
            paths: { '/pets': { get: { parameters: [{ $ref: 'common.json#/Limit' }] } } },
            gap: [ImportGapTypes.EXTERNAL_REFS, ['common.json#/Limit'], 1],
        },
        {
            name: 'cookie parameters',
            paths: { '/pets': { get: { parameters: [{ name: 'session', in: 'cookie' }] } } },
            gap: [ImportGapTypes.COOKIE_PARAMETERS, ['session'], 1],
        },
        {
            name: 'a TRACE operation',
            paths: { '/pets': { trace: {} } },
            gap: [ImportGapTypes.METHODS, ['TRACE'], 1],
        },
        {
            name: 'the body of a GET operation',
            paths: { '/pets': { get: { requestBody: { content: { 'text/plain': { example: 'x' } } } } } },
            gap: [ImportGapTypes.BODIES_OF_BODYLESS, [HttpMethods.GET], 1],
        },
    ])('names $name', ({ paths, gap }) => {
        expect(readGaps(makeDescription({ paths, security: [] }))).toEqual([gap]);
    });

    it('stops at a schema that contains itself', () => {
        const node = { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } };
        const description = makeDescription({
            paths: { '/nodes': { post: { requestBody: { content: { 'application/json': { schema: node } } } } } },
            components: { schemas: { Node: node } },
            security: [],
        });
        const [request] = collectRequests(readImport(description).collection?.items ?? []);
        const body = request?.body.bodyType === RequestBodyTypes.JSON ? JSON.parse(request.body.text) : undefined;

        expect(body).toEqual({ child: { child: null } });
    });

    it('keeps the example of a wide description short', () => {
        const levels = 9;
        const schemas: Record<string, object> = {};

        for (let idx = 0; idx < levels; idx += 1) {
            const fields = Array.from({ length: 10 }, (_, field) => [
                `f${field}`,
                { $ref: `#/components/schemas/S${idx + 1}` },
            ]);

            schemas[`S${idx}`] = { type: 'object', properties: Object.fromEntries(fields) };
        }

        const description = makeDescription({
            paths: {
                '/wide': {
                    post: {
                        requestBody: {
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/S0' } } },
                        },
                    },
                },
            },
            components: { schemas },
            security: [],
        });
        const [request] = collectRequests(readImport(description).collection?.items ?? []);
        const text = request?.body.bodyType === RequestBodyTypes.JSON ? request.body.text : '';

        expect(text.length).toBeLessThan(20_000);
    });

    it('escapes what would split the query in a value of the description', () => {
        const parameters = [{ name: 'since', in: 'query', required: true, example: '2026-01-01T10:00:00+03:00' }];

        expect(readRequest({ '/events': { get: { parameters } } }, { security: [] })).toMatchObject({
            url: '{{baseUrl}}/events?since=2026-01-01T10:00:00%2B03:00',
            query: [{ key: 'since', value: '2026-01-01T10:00:00%2B03:00', enabled: true }],
        });
    });

    it('skips extensions among the paths', () => {
        expect(readRequests({ 'x-internal': { get: { summary: 'Hidden' } } })).toEqual([]);
    });

    it('names operations with servers of their own', () => {
        const paths = { '/files': { servers: [{ url: 'https://files.example.com' }], get: {} } };

        expect(readGaps(makeDescription({ paths, security: [] }))).toEqual([[ImportGapTypes.OWN_SERVERS, [], 1]]);
    });

    it('refuses a version it does not read', () => {
        const result = parseImportFile(JSON.stringify(makeDescription({ openapi: '2.0' })), NAMES);

        expect(result).toMatchObject({ ok: false, issues: [{ path: '$.openapi' }] });
    });
});
