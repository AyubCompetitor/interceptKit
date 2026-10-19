import { describe, expect, it } from '@rstest/core';

import { validate } from '#shared/lib';

import { ruleValidator, rulesValidator } from './rule.ts';

const MATCH = { url: { kind: 'filter', value: '||api.example.com/' } };
const BASE = { id: 'r1', name: 'Rule', enabled: true, source: 'user', match: MATCH };

const createHeaderRule = (op: object) => ({ ...BASE, type: 'headers', request: [op], response: [] });

describe('rule', () => {
    it('accepts each rule type', () => {
        const redirect = { ...BASE, type: 'redirect', to: { kind: 'url', url: 'https://staging.example.com/' } };

        const headers = {
            ...BASE,
            type: 'headers',
            request: [{ name: 'X-Debug', operation: 'set', value: '1' }],
            response: [{ name: 'Server', operation: 'remove' }],
        };

        expect(validate(ruleValidator, redirect).ok).toBe(true);

        expect(validate(ruleValidator, headers).ok).toBe(true);

        expect(validate(ruleValidator, { ...BASE, type: 'block' }).ok).toBe(true);
    });

    it('refuses redirects to non-http URLs', () => {
        // oxlint-disable-next-line no-script-url -- the test proves such targets are rejected
        const rule = { ...BASE, type: 'redirect', to: { kind: 'url', url: 'javascript:alert(1)' } };

        expect(validate(ruleValidator, rule).ok).toBe(false);
    });

    it('requires a regex pattern for regexSubstitution', () => {
        const to = { kind: 'regexSubstitution', value: 'https://new.example.com/\\1' };
        const regexMatch = { url: { kind: 'regex', value: '^https://old\\.example\\.com/(.*)$' } };

        expect(validate(ruleValidator, { ...BASE, type: 'redirect', to }).ok).toBe(false);

        expect(validate(ruleValidator, { ...BASE, match: regexMatch, type: 'redirect', to }).ok).toBe(true);
    });

    it('checks header operations', () => {
        const setWithoutValue = createHeaderRule({ name: 'A', operation: 'set' });
        const removeWithValue = createHeaderRule({ name: 'A', operation: 'remove', value: 'x' });
        const injectedValue = createHeaderRule({ name: 'A', operation: 'set', value: 'x\r\nB: 1' });
        const noChanges = { ...BASE, type: 'headers', request: [], response: [] };

        expect(validate(ruleValidator, setWithoutValue).ok).toBe(false);

        expect(validate(ruleValidator, removeWithValue).ok).toBe(false);

        expect(validate(ruleValidator, injectedValue).ok).toBe(false);

        expect(validate(ruleValidator, noChanges).ok).toBe(false);
    });

    it('rejects empty condition lists, which DNR does not accept', () => {
        const rule = { ...BASE, type: 'block', match: { ...MATCH, methods: [] } };

        expect(validate(ruleValidator, rule).ok).toBe(false);
    });

    it('rejects unknown types and fields', () => {
        expect(validate(ruleValidator, { ...BASE, type: 'allow' }).ok).toBe(false);

        expect(validate(ruleValidator, { ...BASE, type: 'block', priority: 9 }).ok).toBe(false);
    });

    it('requires unique ids in a rule list', () => {
        const block = { ...BASE, type: 'block' };

        expect(validate(rulesValidator, [block, { ...block, id: 'r2' }]).ok).toBe(true);

        expect(validate(rulesValidator, [block, block]).ok).toBe(false);
    });
});
