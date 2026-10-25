import { describe, expect, it } from '@rstest/core';

import {
    CollectionItemTypes,
    isFolderItem,
    RequestBodyTypes,
    type ApiRequest,
    type Collection,
} from '#entities/request';
import { HttpMethods } from '#shared/lib';

import { ImportGapTypes } from '../importGaps.ts';
import type { ImportedFile } from '../importedFile.ts';
import { parseImportFile } from '../importFile.ts';

const NAMES = {
    unnamed: 'Untitled',
    variablesSuffix: ': variables',
};

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

const makeCollectionText = (items: readonly object[], overrides: object = {}): string =>
    JSON.stringify({
        info: { name: 'Shop API', schema: SCHEMA },
        item: items,
        ...overrides,
    });

const makeRequestItem = (request: object, overrides: object = {}) => ({
    name: 'List users',
    request: { method: HttpMethods.GET, url: 'https://api.example.com/users', ...request },
    ...overrides,
});

const readImport = (text: string): ImportedFile => {
    const result = parseImportFile(text, NAMES);

    if (!result.ok) {
        throw new Error(result.issues.map(issue => `${issue.path}: ${issue.message}`).join('; '));
    }

    return result.value;
};

const getFirstRequest = (collection: NotRequired<Collection>): ApiRequest => {
    const [item] = collection?.items ?? [];

    if (!item || isFolderItem(item)) {
        throw new Error('expected a request at the top of the collection');
    }

    return item.request;
};

const readRequest = (request: object, overrides: object = {}): ApiRequest =>
    getFirstRequest(readImport(makeCollectionText([makeRequestItem(request)], overrides)).collection);

/** Folders inside one another, with a request in the deepest */
const nestFolders = (levels: number): object =>
    levels === 0 ? makeRequestItem({}) : { name: `Level ${levels}`, item: [nestFolders(levels - 1)] };

const readGaps = (text: string) => readImport(text).gaps.map(gap => [gap.gapType, gap.details, gap.count]);

const getIssueText = (text: string): string => {
    const result = parseImportFile(text, NAMES);

    if (result.ok) {
        throw new Error('expected the file to be refused');
    }

    return result.issues.map(issue => `${issue.path}: ${issue.message}`).join('; ');
};

describe('a collection', () => {
    const text = makeCollectionText(
        [
            {
                name: 'Users',
                item: [
                    makeRequestItem({
                        header: [
                            { key: 'Accept', value: 'application/json' },
                            { key: 'X-Debug', value: '1', disabled: true },
                        ],
                        url: {
                            raw: '{{baseUrl}}/users/:id?page=2',
                            host: ['{{baseUrl}}'],
                            path: ['users', ':id'],
                            query: [
                                { key: 'page', value: '2' },
                                { key: 'debug', value: null, disabled: true },
                            ],
                            variable: [{ key: 'id', value: '7' }],
                        },
                    }),
                ],
            },
        ],
        {
            auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
            variable: [
                { key: 'baseUrl', value: 'https://api.example.com' },
                { key: 'token', value: 'abc', type: 'secret' },
                { key: 'old', value: 1, disabled: true },
            ],
        },
    );

    const { collection, environment, gaps } = readImport(text);
    const [folder] = collection?.items ?? [];

    it('keeps the folders and the names', () => {
        expect(collection?.name).toBe('Shop API');

        expect(folder).toMatchObject({ itemType: CollectionItemTypes.FOLDER, name: 'Users' });
    });

    it('reads a request with the query of its URL and the authorization of the collection', () => {
        const request = folder && isFolderItem(folder) ? folder.items[0] : undefined;

        expect(request).toMatchObject({
            request: {
                name: 'List users',
                method: HttpMethods.GET,
                url: '{{baseUrl}}/users/7?page=2',
                query: [
                    { key: 'page', value: '2', enabled: true },
                    { key: 'debug', value: '', enabled: false },
                ],
                headers: [
                    { key: 'Accept', value: 'application/json', enabled: true },
                    { key: 'X-Debug', value: '1', enabled: false },
                    { key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
                ],
                body: { bodyType: RequestBodyTypes.NONE },
                sendCookies: false,
            },
        });
    });

    it('makes an environment of the variables of the collection', () => {
        expect(environment).toMatchObject({
            name: 'Shop API: variables',
            variables: [
                { key: 'baseUrl', value: 'https://api.example.com', enabled: true, secret: false },
                { key: 'token', value: 'abc', enabled: true, secret: true },
                { key: 'old', value: '1', enabled: false, secret: false },
            ],
        });

        expect(gaps).toEqual([]);
    });

    it('brings no environment without variables', () => {
        expect(readImport(makeCollectionText([])).environment).toBeUndefined();
    });

    it('names what has no name', () => {
        const unnamed = readImport(JSON.stringify({ info: { schema: SCHEMA }, item: [{ item: [] }] }));

        expect(unnamed.collection).toMatchObject({ name: 'Untitled', items: [{ name: 'Untitled' }] });
    });
});

describe('the URL of a request', () => {
    it.each([
        { name: 'a plain string', url: 'https://api.example.com/a', expected: 'https://api.example.com/a' },
        {
            name: 'the parts of an old export',
            url: {
                protocol: 'https',
                host: ['api', 'example', 'com'],
                port: '8443',
                path: ['users', { value: 'list' }],
                query: [{ key: 'page', value: '2' }],
            },
            expected: 'https://api.example.com:8443/users/list?page=2',
        },
        {
            name: 'a path variable without a value',
            url: { raw: 'https://api.example.com/users/:id', variable: [{ key: 'id', value: '' }] },
            expected: 'https://api.example.com/users/:id',
        },
    ])('reads $name', ({ url, expected }) => {
        expect(readRequest({ url }).url).toBe(expected);
    });

    it('takes the whole request when it is only a URL', () => {
        const request = getFirstRequest(
            readImport(makeCollectionText([{ name: 'Plain', request: 'https://api.example.com/plain' }])).collection,
        );

        expect(request).toMatchObject({ method: HttpMethods.GET, url: 'https://api.example.com/plain' });
    });

    it('reads the headers an old export writes as text', () => {
        expect(readRequest({ header: 'Accept: text/html\nX-Id: 1\n' }).headers).toEqual([
            { key: 'Accept', value: 'text/html', enabled: true },
            { key: 'X-Id', value: '1', enabled: true },
        ]);
    });
});

describe('the body of a request', () => {
    const JSON_HEADER = [{ key: 'Content-Type', value: 'application/json' }];

    it.each([
        {
            name: 'raw JSON',
            request: { body: { mode: 'raw', raw: '{"a":1}', options: { raw: { language: 'json' } } } },
            expected: { bodyType: RequestBodyTypes.JSON, text: '{"a":1}' },
        },
        {
            name: 'raw text with a JSON content type',
            request: { header: JSON_HEADER, body: { mode: 'raw', raw: '{}' } },
            expected: { bodyType: RequestBodyTypes.JSON, text: '{}' },
        },
        {
            name: 'raw XML',
            request: { body: { mode: 'raw', raw: '<a/>', options: { raw: { language: 'xml' } } } },
            expected: { bodyType: RequestBodyTypes.RAW, text: '<a/>', contentType: 'application/xml' },
        },
        {
            name: 'a URL-encoded form',
            request: {
                body: {
                    mode: 'urlencoded',
                    urlencoded: [
                        { key: 'name', value: 'Ann' },
                        { key: 'age', value: '7', disabled: true },
                    ],
                },
            },
            expected: {
                bodyType: RequestBodyTypes.FORM,
                fields: [
                    { key: 'name', value: 'Ann', enabled: true },
                    { key: 'age', value: '7', enabled: false },
                ],
            },
        },
        {
            name: 'an empty raw body',
            request: { body: { mode: 'raw', raw: '' } },
            expected: { bodyType: RequestBodyTypes.NONE },
        },
        {
            name: 'a body switched off',
            request: { body: { mode: 'raw', raw: 'x', disabled: true } },
            expected: { bodyType: RequestBodyTypes.NONE },
        },
    ])('reads $name', ({ request, expected }) => {
        expect(readRequest({ method: HttpMethods.POST, ...request }).body).toEqual(expected);
    });

    it('leaves out a multipart form and says so', () => {
        const body = { mode: 'formdata', formdata: [{ key: 'file', type: 'file', src: '/tmp/a.png' }] };
        const text = makeCollectionText([makeRequestItem({ method: HttpMethods.POST, body })]);

        expect(getFirstRequest(readImport(text).collection).body).toEqual({ bodyType: RequestBodyTypes.NONE });

        expect(readGaps(text)).toEqual([[ImportGapTypes.BODIES, ['formdata'], 1]]);
    });

    it('leaves out the body of a GET request and says so', () => {
        const text = makeCollectionText([makeRequestItem({ body: { mode: 'raw', raw: 'x' } })]);

        expect(readGaps(text)).toEqual([[ImportGapTypes.BODIES_OF_BODYLESS, [HttpMethods.GET], 1]]);
    });
});

describe('authorization', () => {
    it.each([
        {
            name: 'a bearer token of v2.0',
            auth: { type: 'bearer', bearer: { token: 'abc' } },
            expected: { key: 'Authorization', value: 'Bearer abc' },
        },
        {
            name: 'an API key in a header',
            auth: {
                type: 'apikey',
                apikey: [
                    { key: 'key', value: 'X-Api-Key' },
                    { key: 'value', value: '{{key}}' },
                ],
            },
            expected: { key: 'X-Api-Key', value: '{{key}}' },
        },
        {
            name: 'basic credentials',
            auth: {
                type: 'basic',
                basic: [
                    { key: 'username', value: 'user' },
                    { key: 'password', value: 'pass' },
                ],
            },
            expected: { key: 'Authorization', value: 'Basic dXNlcjpwYXNz' },
        },
    ])('turns $name into a header', ({ auth, expected }) => {
        expect(readRequest({ auth }).headers).toEqual([{ ...expected, enabled: true }]);
    });

    it('escapes an API key that would split the query', () => {
        const auth = {
            type: 'apikey',
            apikey: [
                { key: 'key', value: 'api_key' },
                { key: 'value', value: 'a&b' },
                { key: 'in', value: 'query' },
            ],
        };

        expect(readRequest({ auth }).url).toBe('https://api.example.com/users?api_key=a%26b');
    });

    it('puts an API key for the query into the URL', () => {
        const auth = {
            type: 'apikey',
            apikey: [
                { key: 'key', value: 'api_key' },
                { key: 'value', value: 'abc' },
                { key: 'in', value: 'query' },
            ],
        };

        expect(readRequest({ url: 'https://api.example.com/a?page=2', auth })).toMatchObject({
            url: 'https://api.example.com/a?page=2&api_key=abc',
            query: [
                { key: 'page', value: '2', enabled: true },
                { key: 'api_key', value: 'abc', enabled: true },
            ],
        });
    });

    it('keeps an Authorization header the request sets itself', () => {
        const header = [{ key: 'authorization', value: 'Token own' }];
        const auth = { type: 'bearer', bearer: [{ key: 'token', value: 'abc' }] };

        expect(readRequest({ header, auth }).headers).toEqual([{ ...header[0], enabled: true }]);
    });

    it('takes the authorization of the nearest folder, and none where a request says so', () => {
        const folder = {
            name: 'Admin',
            auth: { type: 'bearer', bearer: [{ key: 'token', value: 'admin' }] },
            item: [makeRequestItem({}), makeRequestItem({ auth: { type: 'noauth' } }, { name: 'Open' })],
        };
        const auth = { type: 'bearer', bearer: [{ key: 'token', value: 'user' }] };
        const { collection } = readImport(makeCollectionText([folder], { auth }));
        const [admin] = collection?.items ?? [];
        const requests = admin && isFolderItem(admin) ? admin.items : [];

        expect(requests).toMatchObject([
            { request: { headers: [{ key: 'Authorization', value: 'Bearer admin' }] } },
            { request: { headers: [] } },
        ]);
    });

    it.each([
        {
            name: 'basic credentials with variables',
            auth: { type: 'basic', basic: [{ key: 'username', value: '{{user}}' }] },
            gap: [ImportGapTypes.BASIC_WITH_VARIABLES, [], 1],
        },
        {
            name: 'OAuth 2.0',
            auth: { type: 'oauth2', oauth2: [] },
            gap: [ImportGapTypes.AUTHS, ['oauth2'], 1],
        },
    ])('leaves out $name and says so', ({ auth, gap }) => {
        const text = makeCollectionText([makeRequestItem({ auth })]);

        expect(getFirstRequest(readImport(text).collection).headers).toEqual([]);

        expect(readGaps(text)).toEqual([gap]);
    });
});

describe('what the client cannot carry over', () => {
    it('counts scripts and examples, and never takes them', () => {
        const script = { listen: 'test', script: { exec: ['pm.test("ok", () => {});'] } };
        const emptyScript = { listen: 'prerequest', script: { exec: [''] } };
        const text = makeCollectionText([makeRequestItem({}, { event: [script, emptyScript], response: [{}, {}] })], {
            event: [script],
        });

        expect(readGaps(text)).toEqual([
            [ImportGapTypes.SCRIPTS, [], 2],
            [ImportGapTypes.EXAMPLES, [], 2],
        ]);
    });

    it('skips requests with a method the client does not send', () => {
        const text = makeCollectionText([makeRequestItem({ method: 'COPY' }), makeRequestItem({ method: 'purge' })]);

        expect(readImport(text).collection?.items).toEqual([]);

        expect(readGaps(text)).toEqual([[ImportGapTypes.METHODS, ['COPY', 'PURGE'], 2]]);
    });

    it('names the made-up values of Postman', () => {
        const text = makeCollectionText([makeRequestItem({ url: 'https://a.test/{{$guid}}?t={{$timestamp}}' })]);

        expect(readGaps(text)).toEqual([[ImportGapTypes.DYNAMIC_VARIABLES, ['{{$guid}}', '{{$timestamp}}'], 1]]);
    });

    it('leaves out variables whose names a {{template}} cannot use', () => {
        const text = makeCollectionText([], { variable: [{ key: 'my var', value: '1' }] });

        expect(readGaps(text)).toEqual([[ImportGapTypes.VARIABLE_NAMES, ['my var'], 1]]);
    });

    it('moves the requests of folders deeper than five levels into the fifth one', () => {
        const text = makeCollectionText([nestFolders(7)]);

        let items = readImport(text).collection?.items ?? [];
        let depth = 0;

        while (items[0] && isFolderItem(items[0])) {
            items = items[0].items;
            depth += 1;
        }

        expect(depth).toBe(5);

        expect(items).toMatchObject([{ request: { name: 'List users' } }]);

        expect(readGaps(text)).toEqual([[ImportGapTypes.DEEP_FOLDERS, [], 2]]);
    });
});

describe('an environment', () => {
    it('reads the variables and the secrets of an exported environment', () => {
        const text = JSON.stringify({
            id: 'e1',
            name: 'Staging',
            values: [
                { key: 'baseUrl', value: 'https://staging.example.com', type: 'default', enabled: true },
                { key: 'token', value: 'abc', type: 'secret', enabled: true },
                { key: 'old', value: 'x', type: 'default', enabled: false },
            ],
            _postman_variable_scope: 'environment',
        });

        expect(readImport(text)).toMatchObject({
            environment: {
                name: 'Staging',
                variables: [
                    { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
                    { key: 'token', value: 'abc', enabled: true, secret: true },
                    { key: 'old', value: 'x', enabled: false, secret: false },
                ],
            },
            gaps: [],
        });

        expect(readImport(text).collection).toBeUndefined();
    });
});

describe('a Postman file the client refuses', () => {
    const DEEP_LEVELS = 100_000;

    it.each([
        { name: 'a collection of v1', text: '{"name":"Old","requests":[]}', error: 'v1 cannot be imported' },
        {
            name: 'an unknown version',
            text: JSON.stringify({
                info: { name: 'New', schema: 'https://schema.getpostman.com/json/collection/v3.0.0/' },
            }),
            error: '$.info.schema',
        },
        {
            name: 'folders without end',
            text: makeCollectionText([]).replace(
                '"item":[]',
                `"item":[${'{"item":['.repeat(DEEP_LEVELS)}${']}'.repeat(DEEP_LEVELS)}]`,
            ),
            error: 'nested too deep',
        },
        {
            name: 'a URL longer than the client keeps',
            text: makeCollectionText([makeRequestItem({ url: `https://a.test/${'a'.repeat(9000)}` })]),
            error: '$.collection.items[0].request.url',
        },
    ])('refuses $name', ({ text, error }) => {
        expect(getIssueText(text)).toContain(error);
    });
});
