import { describe, expect, it } from '@rstest/core';

import { compileRules } from '../compileRules.ts';
import { RESOURCE_TYPES } from '../rule.ts';

import { makeValidRule, REGEX_MATCH, URL_FILTER_MATCH } from './mocks.ts';

describe('compileRules', () => {
    describe('ids and priorities', () => {
        it('numbers rules from 1 and gives the first rule the highest priority', () => {
            const compiled = compileRules([makeValidRule({ id: 'a' }), makeValidRule({ id: 'b' })]);

            expect(compiled.map(({ id, priority }) => ({ id, priority }))).toEqual([
                { id: 1, priority: 2 },
                { id: 2, priority: 1 },
            ]);
        });

        it('compiles an empty list to no rules', () => {
            expect(compileRules([])).toEqual([]);
        });
    });

    describe('conditions', () => {
        it('applies a rule without resource types to all of them, main_frame included', () => {
            const [compiled] = compileRules([makeValidRule()]);

            expect(compiled?.condition).toEqual({ urlFilter: '||api.example.com/', resourceTypes: RESOURCE_TYPES });
        });

        it('uses regexFilter for a regex pattern', () => {
            const [compiled] = compileRules([makeValidRule({ match: REGEX_MATCH })]);

            expect(compiled?.condition.regexFilter).toBe(REGEX_MATCH.url.value);
        });

        it('keeps the chosen resource types and domains, with methods in lowercase', () => {
            const match = {
                ...URL_FILTER_MATCH,
                methods: ['GET', 'POST'],
                resourceTypes: ['xmlhttprequest'],
                initiatorDomains: ['app.example.com'],
            };

            const [compiled] = compileRules([makeValidRule({ match })]);

            expect(compiled?.condition).toEqual({
                urlFilter: '||api.example.com/',
                requestMethods: ['get', 'post'],
                resourceTypes: ['xmlhttprequest'],
                initiatorDomains: ['app.example.com'],
            });
        });
    });

    describe('actions', () => {
        it.each([
            {
                name: 'a block rule',
                overrides: {},
                action: { type: 'block' },
            },
            {
                name: 'a redirect to a URL',
                overrides: { type: 'redirect', to: { targetType: 'url', url: 'https://staging.example.com/' } },
                action: { type: 'redirect', redirect: { url: 'https://staging.example.com/' } },
            },
            {
                name: 'a redirect with a URL transform',
                overrides: {
                    type: 'redirect',
                    to: { targetType: 'transform', host: 'staging.example.com', port: '8080' },
                },
                action: { type: 'redirect', redirect: { transform: { host: 'staging.example.com', port: '8080' } } },
            },
            {
                name: 'a regex substitution',
                overrides: {
                    type: 'redirect',
                    match: REGEX_MATCH,
                    to: { targetType: 'regexSubstitution', value: 'https://new.example.com/\\1' },
                },
                action: { type: 'redirect', redirect: { regexSubstitution: 'https://new.example.com/\\1' } },
            },
        ])('compiles $name', ({ overrides, action }) => {
            const [compiled] = compileRules([makeValidRule(overrides)]);

            expect(compiled?.action).toEqual(action);
        });

        it('compiles header changes with lowercase names and no value for remove', () => {
            const rule = makeValidRule({
                type: 'headers',
                request: [{ name: 'X-Debug', operation: 'set', value: '1' }],
                response: [{ name: 'Server', operation: 'remove' }],
            });

            const [compiled] = compileRules([rule]);

            expect(compiled?.action).toEqual({
                type: 'modifyHeaders',
                requestHeaders: [{ header: 'x-debug', operation: 'set', value: '1' }],
                responseHeaders: [{ header: 'server', operation: 'remove' }],
            });
        });

        it('leaves out the side of header changes that is empty', () => {
            const rule = makeValidRule({
                type: 'headers',
                request: [{ name: 'Cookie', operation: 'append', value: 'debug=1' }],
                response: [],
            });

            const [compiled] = compileRules([rule]);

            expect(compiled?.action).toEqual({
                type: 'modifyHeaders',
                requestHeaders: [{ header: 'cookie', operation: 'append', value: 'debug=1' }],
            });
        });
    });
});
