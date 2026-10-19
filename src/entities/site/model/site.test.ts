import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { parseOrigin, sitesValidator } from './site.ts';

describe('site', () => {
    it('normalizes user input to an origin', () => {
        expect(parseOrigin('https://App.Example.com/path?q=1')).toBe('https://app.example.com');

        expect(parseOrigin('http://localhost:3000/')).toBe('http://localhost:3000');

        expect(parseOrigin('chrome://extensions')).toBeUndefined();

        expect(parseOrigin('file:///etc/passwd')).toBeUndefined();

        expect(parseOrigin('not a url')).toBeUndefined();
    });

    it('stores only normalized, unique origins', () => {
        const site = { origin: 'https://a.example', mocks: false };

        expect(validate(sitesValidator, [{ origin: 'https://a.example', mocks: true }]).ok).toBe(true);

        expect(validate(sitesValidator, [{ origin: 'https://a.example/', mocks: true }]).ok).toBe(false);

        expect(validate(sitesValidator, [site, site]).ok).toBe(false);
    });
});
