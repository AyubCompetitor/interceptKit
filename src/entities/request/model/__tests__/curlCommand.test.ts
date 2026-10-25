import { describe, expect, it } from '@rstest/core';

import { HttpMethods } from '#shared/lib';

import { parseCurl } from '../curl.ts';
import { buildCurlCommand } from '../curlCommand.ts';
import { RequestBodyTypes, type ApiRequest } from '../request.ts';

import { makePair } from './mocks.ts';

/** How the command puts each option on a line of its own */
const LINE_BREAK = ' \\\n  ';

const JSON_POST: ApiRequest = {
    id: 'q1',
    method: HttpMethods.POST,
    url: 'https://api.example.com/users',
    query: [],
    headers: [makePair('Authorization', 'Bearer {{token}}')],
    body: { bodyType: RequestBodyTypes.JSON, text: '{"name":"{{name}}"}' },
    sendCookies: false,
};

const makeApiRequest = (overrides: Partial<ApiRequest> = {}): ApiRequest => ({
    ...JSON_POST,
    ...overrides,
});

const GET_REQUEST = makeApiRequest({
    method: HttpMethods.GET,
    url: 'https://api.example.com/users?page=2',
    headers: [makePair('Accept', 'application/json'), makePair('X-Off', '1', false)],
    body: { bodyType: RequestBodyTypes.NONE },
});

const getLines = (request: ApiRequest): string[] => buildCurlCommand(request).split(LINE_BREAK);

describe('buildCurlCommand', () => {
    it('writes a GET request with its enabled headers, one option per line', () => {
        expect(getLines(GET_REQUEST)).toEqual([
            "curl 'https://api.example.com/users?page=2'",
            "-H 'Accept: application/json'",
        ]);
    });

    it('lets curl infer POST from the data and names the type of a JSON body', () => {
        expect(getLines(makeApiRequest())).toEqual([
            "curl 'https://api.example.com/users'",
            "-H 'Authorization: Bearer {{token}}'",
            "-H 'content-type: application/json'",
            `--data-raw '{"name":"{{name}}"}'`,
        ]);
    });

    it.each([
        { name: 'PUT without a body', method: HttpMethods.PUT, option: '-X PUT' },
        { name: 'POST without a body', method: HttpMethods.POST, option: '-X POST' },
        { name: 'HEAD', method: HttpMethods.HEAD, option: '--head' },
    ])('names the method of $name', ({ method, option }) => {
        const lines = getLines(makeApiRequest({ method, body: { bodyType: RequestBodyTypes.NONE } }));

        expect(lines[1]).toBe(option);
    });

    it('keeps the content type the user typed', () => {
        const request = makeApiRequest({ headers: [makePair('Content-Type', 'application/vnd.api+json')] });

        expect(getLines(request).filter(line => line.toLowerCase().includes('content-type'))).toHaveLength(1);
    });

    it('sends a text body without a type as fetch() does', () => {
        const request = makeApiRequest({ body: { bodyType: RequestBodyTypes.RAW, text: 'hello', contentType: '' } });

        expect(getLines(request)).toContain("-H 'content-type: text/plain;charset=UTF-8'");
    });

    it('encodes a form as fetch() does', () => {
        const fields = [makePair('name', 'Ada Lovelace'), makePair('off', '1', false)];
        const request = makeApiRequest({ body: { bodyType: RequestBodyTypes.FORM, fields }, headers: [] });

        expect(getLines(request).at(-1)).toBe("--data-raw 'name=Ada+Lovelace'");
    });

    it('leaves out the body of a GET request', () => {
        const request = makeApiRequest({ method: HttpMethods.GET });

        expect(buildCurlCommand(request)).not.toContain('--data-raw');
    });

    it('quotes values that single quotes cannot hold', () => {
        const request = makeApiRequest({ body: { bodyType: RequestBodyTypes.JSON, text: `{\n  "it's": 1\n}` } });

        expect(getLines(request).at(-1)).toBe(String.raw`--data-raw $'{\n  "it\'s": 1\n}'`);
    });
});

describe('a command read back by parseCurl', () => {
    it.each([
        { name: 'a GET request with a query', request: GET_REQUEST },
        { name: 'a JSON POST', request: makeApiRequest() },
        {
            name: 'a form PATCH',
            request: makeApiRequest({
                method: HttpMethods.PATCH,
                headers: [],
                body: { bodyType: RequestBodyTypes.FORM, fields: [makePair('a', '1 2'), makePair('b', 'x&y')] },
            }),
        },
        {
            name: 'a raw DELETE with a typed type and a quote',
            request: makeApiRequest({
                method: HttpMethods.DELETE,
                headers: [makePair('Content-Type', 'text/csv')],
                body: { bodyType: RequestBodyTypes.RAW, text: "id\n'1'", contentType: 'text/csv' },
            }),
        },
    ])('gives back $name', ({ request }) => {
        const result = parseCurl(buildCurlCommand(request));

        expect(result).toMatchObject({
            ok: true,
            value: {
                method: request.method,
                url: request.url,
                body: request.body,
            },
        });
    });
});
