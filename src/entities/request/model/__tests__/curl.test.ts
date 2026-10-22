import { describe, expect, it } from '@rstest/core';

import { HttpMethods, type KeyValue } from '#shared/lib';

import { parseCurl } from '../curl.ts';
import { RequestBodyTypes } from '../request.ts';

const pair = (key: string, value: string): KeyValue => ({ key, value, enabled: true });

const NO_BODY = { bodyType: RequestBodyTypes.NONE };

/** As Chrome's "Copy as cURL (bash)" writes a JSON POST */
const CHROME_COMMAND = [
    "curl 'https://api.example.com/users?page=2' \\",
    "  -H 'accept: application/json' \\",
    "  -H 'content-type: application/json' \\",
    `  --data-raw $'{"name":"O\\'Brien"}'`,
].join('\n');

const getImport = (command: string) => {
    const result = parseCurl(command);

    if (!result.ok) {
        throw new Error(`expected ${command} to parse`);
    }

    return result.value;
};

describe('parseCurl', () => {
    it("reads Chrome's Copy as cURL", () => {
        expect(getImport(CHROME_COMMAND)).toEqual({
            method: HttpMethods.POST,
            url: 'https://api.example.com/users',
            query: [pair('page', '2')],
            headers: [pair('accept', 'application/json'), pair('content-type', 'application/json')],
            body: { bodyType: RequestBodyTypes.JSON, text: `{"name":"O'Brien"}` },
        });
    });

    it.each([
        { name: 'a bare URL as GET', command: 'curl example.com/api', method: HttpMethods.GET },
        { name: 'an explicit method', command: "curl -X put 'https://example.com/'", method: HttpMethods.PUT },
        { name: 'a method glued to -X', command: 'curl -XDELETE https://example.com/', method: HttpMethods.DELETE },
        { name: 'data as a POST', command: "curl https://example.com/ -d 'a=1'", method: HttpMethods.POST },
        { name: '-I as HEAD', command: 'curl -I https://example.com/', method: HttpMethods.HEAD },
        { name: '-G with data as GET', command: "curl -G https://example.com/ -d 'a=1'", method: HttpMethods.GET },
    ])('reads $name', ({ command, method }) => {
        expect(getImport(command).method).toBe(method);
    });

    it('gives a URL without a scheme the http scheme, as curl does', () => {
        expect(getImport('curl example.com/api').url).toBe('http://example.com/api');
    });

    it.each([
        {
            name: 'form data into fields',
            command: "curl https://example.com/ -d 'name=Ann+Lee&city=Paris%20' -d 'x=1'",
            body: {
                bodyType: RequestBodyTypes.FORM,
                fields: [pair('name', 'Ann Lee'), pair('city', 'Paris '), pair('x', '1')],
            },
        },
        {
            name: 'url-encoded data',
            command: "curl https://example.com/ --data-urlencode 'q=a b&c'",
            body: { bodyType: RequestBodyTypes.FORM, fields: [pair('q', 'a b&c')] },
        },
        {
            name: 'data that is not a form as raw text',
            command: "curl https://example.com/ -d 'hello'",
            body: { bodyType: RequestBodyTypes.RAW, text: 'hello', contentType: 'application/x-www-form-urlencoded' },
        },
        {
            name: 'a text body with its content type',
            command: "curl https://example.com/ -H 'Content-Type: text/plain' -d 'a=1'",
            body: { bodyType: RequestBodyTypes.RAW, text: 'a=1', contentType: 'text/plain' },
        },
        {
            name: '--json as a JSON body',
            command: `curl https://example.com/ --json '{"a":1}'`,
            body: { bodyType: RequestBodyTypes.JSON, text: '{"a":1}' },
        },
    ])('reads $name', ({ command, body }) => {
        expect(getImport(command).body).toEqual(body);
    });

    it('moves the data of -G into the query', () => {
        expect(getImport("curl -G 'https://example.com/?a=1' -d 'b=2&c=3'")).toMatchObject({
            query: [pair('a', '1'), pair('b', '2'), pair('c', '3')],
            body: NO_BODY,
        });
    });

    it.each([
        {
            name: 'credentials',
            command: 'curl -u user:pass https://example.com/',
            header: pair('Authorization', 'Basic dXNlcjpwYXNz'),
        },
        {
            name: 'cookies',
            command: "curl -b 'id=1; theme=dark' https://example.com/",
            header: pair('Cookie', 'id=1; theme=dark'),
        },
        {
            name: 'a user agent',
            command: "curl -A 'Bot/1.0' https://example.com/",
            header: pair('User-Agent', 'Bot/1.0'),
        },
        {
            name: 'a referer',
            command: 'curl -e https://ref.example/ https://example.com/',
            header: pair('Referer', 'https://ref.example/'),
        },
    ])('turns $name into a header', ({ command, header }) => {
        expect(getImport(command).headers).toEqual([header]);
    });

    it('ignores flags and options the request has no use for', () => {
        const command = 'curl -sSL --compressed -k -o out.json --max-time 5 -b cookies.txt https://example.com/';

        expect(getImport(command)).toEqual({
            method: HttpMethods.GET,
            url: 'https://example.com/',
            query: [],
            headers: [],
            body: NO_BODY,
        });
    });

    it.each([
        {
            name: 'another program',
            command: 'wget https://example.com/',
            error: 'the command does not start with curl',
        },
        { name: 'an open quote', command: "curl 'https://example.com/", error: 'a quote is not closed' },
        { name: 'no URL', command: 'curl -X POST', error: 'the command has no URL' },
        { name: 'an option without its value', command: 'curl https://example.com/ -H', error: '-H needs a value' },
        {
            name: 'a method the client does not send',
            command: 'curl -X TRACE https://example.com/',
            error: 'TRACE is not',
        },
        {
            name: 'a multipart form',
            command: "curl -F 'file=@a.png' https://example.com/",
            error: '-F is not supported',
        },
    ])('refuses $name with a reason', ({ command, error }) => {
        expect(parseCurl(command)).toMatchObject({
            ok: false,
            issues: [{ message: expect.stringContaining(error) }],
        });
    });
});
