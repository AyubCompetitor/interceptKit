import { describe, expect, it } from '@rstest/core';

import { DnrTypes, HeaderOperations, ResourceTypes } from '#entities/rule';

import { buildHeaderRule, getNextRuleId, getTabRuleIds } from '../headerRules.ts';

const PARAMS = {
    host: 'api.example.com',
    headers: [
        { name: 'cookie', value: 'a=1' },
        { name: 'user-agent', value: 'Test' },
    ],
};

const TARGET = {
    id: 4,
    priority: 30_001,
    tabId: 12,
    extensionId: 'abcdefghijklmnopabcdefghijklmnop',
};

const makeSessionRule = (id: number, tabIds: number[]) => ({ id, condition: { tabIds } });

describe('buildHeaderRule', () => {
    it('sets the headers on requests of one tab of the extension to the host', () => {
        expect(buildHeaderRule(PARAMS, TARGET)).toEqual({
            id: 4,
            priority: 30_001,
            action: {
                type: DnrTypes.MODIFY_HEADERS,
                requestHeaders: [
                    { header: 'cookie', operation: HeaderOperations.SET, value: 'a=1' },
                    { header: 'user-agent', operation: HeaderOperations.SET, value: 'Test' },
                ],
            },
            condition: {
                requestDomains: ['api.example.com'],
                initiatorDomains: [TARGET.extensionId],
                tabIds: [12],
                resourceTypes: [ResourceTypes.XMLHTTPREQUEST],
            },
        });
    });
});

describe('getTabRuleIds', () => {
    it('finds the rules a tab left behind', () => {
        const rules = [makeSessionRule(1, [12]), makeSessionRule(2, [5]), makeSessionRule(3, [12])];

        expect(getTabRuleIds(rules, 12)).toEqual([1, 3]);
    });
});

describe('getNextRuleId', () => {
    it.each([
        { name: 'one without rules', rules: [], id: 1 },
        { name: 'one above the highest id', rules: [makeSessionRule(7, [1]), makeSessionRule(3, [2])], id: 8 },
    ])('gives $name', ({ rules, id }) => {
        expect(getNextRuleId(rules)).toBe(id);
    });
});
