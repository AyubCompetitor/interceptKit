import { describe, expect, it } from '@rstest/core';

import { appendRawQuery, encodeQueryPair, parseRawQuery, replaceRawQuery } from '../urlQuery.ts';

import { makePair } from './mocks.ts';

describe('parseRawQuery', () => {
    it.each([
        { name: 'a URL without a query', url: 'https://a.example/users', pairs: [] },
        {
            name: 'pairs as typed, nothing decoded',
            url: 'https://a.example/?q=a%20b&sort=-name',
            pairs: [makePair('q', 'a%20b'), makePair('sort', '-name')],
        },
        {
            name: 'a key without a value and a value with =',
            url: '{{baseUrl}}?debug&filter=a=b',
            pairs: [makePair('debug', ''), makePair('filter', 'a=b')],
        },
        {
            name: 'a query before the fragment only',
            url: 'https://a.example/?page=2#part?x=1',
            pairs: [makePair('page', '2')],
        },
        { name: 'empty parts', url: 'https://a.example/?&a=1&&', pairs: [makePair('a', '1')] },
    ])('reads $name', ({ url, pairs }) => {
        expect(parseRawQuery(url)).toEqual(pairs);
    });
});

describe('replaceRawQuery', () => {
    const pairs = [makePair('page', '2'), makePair('off', '1', false), makePair('', 'x'), makePair('debug', '')];

    it.each([
        {
            name: 'writes the switched-on pairs as they are',
            url: 'https://a.example/users?old=1',
            expected: 'https://a.example/users?page=2&debug',
        },
        {
            name: 'keeps the fragment after the query',
            url: 'https://a.example/users#top',
            expected: 'https://a.example/users?page=2&debug#top',
        },
    ])('$name', ({ url, expected }) => {
        expect(replaceRawQuery(url, pairs)).toBe(expected);
    });

    it('drops the ? when no pair is left', () => {
        expect(replaceRawQuery('https://a.example/users?page=2', [])).toBe('https://a.example/users');
    });

    it('gives back the URL a parsed query came from', () => {
        const url = '{{baseUrl}}/search?q={{term}}&debug#results';

        expect(replaceRawQuery(url, parseRawQuery(url))).toBe(url);
    });
});

describe('appendRawQuery', () => {
    it.each([
        { name: 'starts a query', url: 'https://a.example/', expected: 'https://a.example/?b=2' },
        {
            name: 'joins the query there is',
            url: 'https://a.example/?a=1#top',
            expected: 'https://a.example/?a=1&b=2#top',
        },
    ])('$name', ({ url, expected }) => {
        expect(appendRawQuery(url, ['b=2'])).toBe(expected);
    });
});

describe('encodeQueryPair', () => {
    it('escapes what would split the pair and keeps {{variables}}', () => {
        expect(encodeQueryPair(makePair('a=b', '1&2 #3+{{x}}%'))).toBe('a%3Db=1%262 %233%2B{{x}}%25');
    });
});
