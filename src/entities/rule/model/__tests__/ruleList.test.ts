import { describe, expect, it } from '@rstest/core';

import { removeRule, upsertRule } from '../ruleList.ts';

import { makeValidRule } from './mocks.ts';

const FIRST_RULE = makeValidRule({ id: 'first' });

const SECOND_RULE = makeValidRule({ id: 'second' });

describe('upsertRule', () => {
    it('adds a new rule at the end', () => {
        expect(upsertRule([FIRST_RULE], SECOND_RULE)).toEqual([FIRST_RULE, SECOND_RULE]);
    });

    it('replaces the rule with the same id in place', () => {
        const renamed = { ...FIRST_RULE, name: 'Renamed' };

        expect(upsertRule([FIRST_RULE, SECOND_RULE], renamed)).toEqual([renamed, SECOND_RULE]);
    });
});

describe('removeRule', () => {
    it('drops the rule with the given id', () => {
        expect(removeRule([FIRST_RULE, SECOND_RULE], 'first')).toEqual([SECOND_RULE]);
    });

    it('keeps the list when the id is unknown', () => {
        expect(removeRule([FIRST_RULE], 'missing')).toEqual([FIRST_RULE]);
    });
});
