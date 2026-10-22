import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { parseOrigin, sitesValidator } from '../site.ts';

import { makeSite } from './mocks.ts';

describe('parseOrigin', () => {
    it.each([
        { input: 'https://App.Example.com/path?q=1', expected: 'https://app.example.com' },
        { input: 'http://localhost:3000/', expected: 'http://localhost:3000' },
    ])('normalizes $input', ({ input, expected }) => {
        expect(parseOrigin(input)).toBe(expected);
    });

    it.each(['chrome://extensions', 'file:///etc/passwd', 'not a url'])('rejects %s', input => {
        expect(parseOrigin(input)).toBeUndefined();
    });
});

describe('sitesValidator', () => {
    it.each([
        { pattern: '*://*.example.com/*' },
        { pattern: '*://example.com/*' },
        { pattern: 'http://127.0.0.1/*' },
        { pattern: '*://*/*' },
    ])('accepts the granted pattern $pattern', ({ pattern }) => {
        expect(validate(sitesValidator, [makeSite({ pattern })]).ok).toBe(true);
    });

    it.each([
        { name: 'an origin instead of a pattern', pattern: 'https://example.com' },
        { name: 'a pattern for one path', pattern: '*://example.com/api/*' },
        { name: 'a pattern of another scheme', pattern: 'file:///*' },
    ])('rejects $name', ({ pattern }) => {
        expect(validate(sitesValidator, [makeSite({ pattern })]).ok).toBe(false);
    });

    it('rejects duplicate patterns', () => {
        expect(validate(sitesValidator, [makeSite(), makeSite({ mocks: false })]).ok).toBe(false);
    });
});
