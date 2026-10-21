import { describe, expect, it } from '@rstest/core';

import { HttpMethods } from '#shared/lib';

import { compileRules } from '../compileRules.ts';
import { DnrTypes } from '../dnr.ts';
import { HeaderOperations, RESOURCE_TYPES, ResourceTypes, RuleTargetTypes, RuleTypes } from '../rule.ts';

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
                methods: [HttpMethods.GET, HttpMethods.POST],
                resourceTypes: [ResourceTypes.XMLHTTPREQUEST],
                initiatorDomains: ['app.example.com'],
            };

            const [compiled] = compileRules([makeValidRule({ match })]);

            expect(compiled?.condition).toEqual({
                urlFilter: '||api.example.com/',
                requestMethods: ['get', 'post'],
                resourceTypes: [ResourceTypes.XMLHTTPREQUEST],
                initiatorDomains: ['app.example.com'],
            });
        });
    });

    describe('actions', () => {
        it.each([
            {
                name: 'a block rule',
                overrides: {},
                action: { type: DnrTypes.BLOCK },
            },
            {
                name: 'a redirect to a URL',
                overrides: {
                    type: RuleTypes.REDIRECT,
                    to: { targetType: RuleTargetTypes.URL, url: 'https://staging.example.com/' },
                },
                action: { type: DnrTypes.REDIRECT, redirect: { url: 'https://staging.example.com/' } },
            },
            {
                name: 'a redirect with a URL transform',
                overrides: {
                    type: RuleTypes.REDIRECT,
                    to: { targetType: RuleTargetTypes.TRANSFORM, host: 'staging.example.com', port: '8080' },
                },
                action: {
                    type: DnrTypes.REDIRECT,
                    redirect: { transform: { host: 'staging.example.com', port: '8080' } },
                },
            },
            {
                name: 'a regex substitution',
                overrides: {
                    type: RuleTypes.REDIRECT,
                    match: REGEX_MATCH,
                    to: { targetType: RuleTargetTypes.RGX_SUBSTITUTION, value: 'https://new.example.com/\\1' },
                },
                action: { type: DnrTypes.REDIRECT, redirect: { regexSubstitution: 'https://new.example.com/\\1' } },
            },
        ])('compiles $name', ({ overrides, action }) => {
            const [compiled] = compileRules([makeValidRule(overrides)]);

            expect(compiled?.action).toEqual(action);
        });

        it('compiles header changes with lowercase names and no value for remove', () => {
            const rule = makeValidRule({
                type: RuleTypes.HEADERS,
                request: [{ name: 'X-Debug', operation: HeaderOperations.SET, value: '1' }],
                response: [{ name: 'Server', operation: HeaderOperations.REMOVE }],
            });

            const [compiled] = compileRules([rule]);

            expect(compiled?.action).toEqual({
                type: DnrTypes.MODIFY_HEADERS,
                requestHeaders: [{ header: 'x-debug', operation: HeaderOperations.SET, value: '1' }],
                responseHeaders: [{ header: 'server', operation: HeaderOperations.REMOVE }],
            });
        });

        it('leaves out the side of header changes that is empty', () => {
            const rule = makeValidRule({
                type: RuleTypes.HEADERS,
                request: [{ name: 'Cookie', operation: HeaderOperations.APPEND, value: 'debug=1' }],
                response: [],
            });

            const [compiled] = compileRules([rule]);

            expect(compiled?.action).toEqual({
                type: DnrTypes.MODIFY_HEADERS,
                requestHeaders: [{ header: 'cookie', operation: HeaderOperations.APPEND, value: 'debug=1' }],
            });
        });
    });
});
