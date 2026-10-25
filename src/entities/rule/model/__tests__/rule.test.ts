import { describe, expect, it } from '@rstest/core';

import { Sources, validate } from '#shared/lib';

import { HeaderOperations, rulesValidator, RuleTargetTypes, RuleTypes, ruleValidator } from '../rule.ts';

import { makeHeaderRule, makeRule, REGEX_MATCH, URL_FILTER_MATCH } from './mocks.ts';

describe('ruleValidator', () => {
    describe('rule types', () => {
        it.each([
            {
                type: RuleTypes.REDIRECT,
                rule: makeRule({
                    type: RuleTypes.REDIRECT,
                    to: {
                        targetType: RuleTargetTypes.URL,
                        url: 'https://staging.example.com/',
                    },
                }),
            },
            {
                type: RuleTypes.HEADERS,
                rule: makeHeaderRule(
                    [{ name: 'X-Debug', operation: HeaderOperations.SET, value: '1' }],
                    [{ name: 'Server', operation: HeaderOperations.REMOVE }],
                ),
            },
            {
                type: RuleTypes.BLOCK,
                rule: makeRule(),
            },
        ])('accepts a $type rule', ({ rule }) => {
            expect(validate(ruleValidator, rule).ok).toBe(true);
        });

        it.each([
            { name: 'an unknown type', rule: makeRule({ type: 'allow' }) },
            { name: 'an unknown field', rule: makeRule({ priority: 9 }) },
            { name: 'an empty condition list', rule: makeRule({ match: { ...URL_FILTER_MATCH, methods: [] } }) },
        ])('rejects $name', ({ rule }) => {
            expect(validate(ruleValidator, rule).ok).toBe(false);
        });
    });

    describe('redirects', () => {
        it('refuses non-http targets', () => {
            // oxlint-disable-next-line no-script-url -- the test proves such targets are rejected
            const to = { targetType: RuleTargetTypes.URL, url: 'javascript:alert(1)' };

            expect(validate(ruleValidator, makeRule({ type: RuleTypes.REDIRECT, to })).ok).toBe(false);
        });

        it('requires a regex URL pattern for regexSubstitution', () => {
            const to = {
                targetType: RuleTargetTypes.RGX_SUBSTITUTION,
                value: 'https://new.example.com/\\1',
            };
            const filterRule = makeRule({ type: RuleTypes.REDIRECT, to });
            const regexRule = makeRule({ type: RuleTypes.REDIRECT, to, match: REGEX_MATCH });

            expect(validate(ruleValidator, filterRule).ok).toBe(false);

            expect(validate(ruleValidator, regexRule).ok).toBe(true);
        });
    });

    describe('header operations', () => {
        it.each([
            { name: 'set without a value', op: { name: 'A', operation: HeaderOperations.SET } },
            { name: 'remove with a value', op: { name: 'A', operation: HeaderOperations.REMOVE, value: 'x' } },
            { name: 'a value with CR/LF', op: { name: 'A', operation: HeaderOperations.SET, value: 'x\r\nB: 1' } },
            {
                name: 'append to a request header DNR does not allow',
                op: { name: 'X-Custom', operation: HeaderOperations.APPEND, value: '1' },
            },
        ])('rejects $name', ({ op }) => {
            expect(validate(ruleValidator, makeHeaderRule([op])).ok).toBe(false);
        });

        it('rejects a headers rule that changes nothing', () => {
            expect(validate(ruleValidator, makeHeaderRule([])).ok).toBe(false);
        });

        it.each([
            {
                name: 'an allowed request header in any case',
                request: [{ name: 'Cookie', operation: HeaderOperations.APPEND, value: 'a=1' }],
                response: [],
            },
            {
                name: 'any response header',
                request: [],
                response: [{ name: 'X-Custom', operation: HeaderOperations.APPEND, value: '1' }],
            },
        ])('allows append to $name', ({ request, response }) => {
            expect(validate(ruleValidator, makeHeaderRule(request, response)).ok).toBe(true);
        });
    });
});

describe('rulesValidator', () => {
    it('accepts rules with different ids', () => {
        expect(validate(rulesValidator, [makeRule(), makeRule({ id: 'r2' })]).ok).toBe(true);
    });

    it('rejects duplicate ids', () => {
        expect(validate(rulesValidator, [makeRule(), makeRule()]).ok).toBe(false);
    });
});

describe('ids of the policy', () => {
    it('belong only to records of the policy', () => {
        expect(validate(ruleValidator, makeRule({ id: 'policy:r1', source: Sources.POLICY })).ok).toBe(true);

        expect(validate(ruleValidator, makeRule({ id: 'policy:r1' })).ok).toBe(false);
    });
});
