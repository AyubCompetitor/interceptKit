import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { parseOrigin, sitesValidator } from '../site.ts';

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
    const site = { origin: 'https://a.example', mocks: false };

    it('accepts normalized origins', () => {
        expect(validate(sitesValidator, [site]).ok).toBe(true);
    });

    it('rejects an origin that is not normalized', () => {
        expect(validate(sitesValidator, [{ ...site, origin: 'https://a.example/' }]).ok).toBe(false);
    });

    it('rejects duplicate origins', () => {
        expect(validate(sitesValidator, [site, site]).ok).toBe(false);
    });
});
