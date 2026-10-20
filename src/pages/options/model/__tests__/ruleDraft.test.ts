import { describe, expect, it } from '@rstest/core';

import { buildRule, createRuleDraft, updateHeaderOp, type HeaderOpDraft } from '../ruleDraft.ts';

import {
    BLOCK_RULE,
    CONDITIONS_RULE,
    HEADER_RULE,
    SUBSTITUTION_RULE,
    TRANSFORM_RULE,
    URL_REDIRECT_RULE,
} from './mocks.ts';

const HEADER_ROWS: HeaderOpDraft[] = [
    { key: 'a', name: 'X-A', operation: 'set', value: '1' },
    { key: 'b', name: 'X-B', operation: 'set', value: '2' },
];

describe('rule drafts', () => {
    it.each([
        { name: 'a block rule', rule: BLOCK_RULE },
        { name: 'a redirect to a URL', rule: URL_REDIRECT_RULE },
        { name: 'a regex substitution', rule: SUBSTITUTION_RULE },
        { name: 'a URL transform', rule: TRANSFORM_RULE },
        { name: 'header changes', rule: HEADER_RULE },
        { name: 'every request condition', rule: CONDITIONS_RULE },
    ])('turn $name into a form and back unchanged', ({ rule }) => {
        expect(buildRule(createRuleDraft(rule))).toEqual(rule);
    });

    it('start a new rule as an enabled redirect with a fresh id', () => {
        const draft = createRuleDraft(undefined);

        expect(draft).toMatchObject({ name: '', enabled: true, type: 'redirect' });

        expect(draft.id).not.toBe(createRuleDraft(undefined).id);
    });

    it('leave out condition lists the user did not fill', () => {
        const draft = { ...createRuleDraft(BLOCK_RULE), methods: [], resourceTypes: [], initiatorDomains: ' ' };

        expect(buildRule(draft).match).toEqual(BLOCK_RULE.match);
    });

    it('split initiator domains on commas and spaces, in lowercase', () => {
        const draft = { ...createRuleDraft(BLOCK_RULE), initiatorDomains: ' App.example.com,admin.example.com  b.io ' };

        expect(buildRule(draft).match.initiatorDomains).toEqual(['app.example.com', 'admin.example.com', 'b.io']);
    });

    it('drop the value of a header that is removed', () => {
        const removal: HeaderOpDraft = { key: 'a', name: ' Server ', operation: 'remove', value: 'nginx' };
        const draft = { ...createRuleDraft(HEADER_RULE), requestHeaders: [], responseHeaders: [removal] };

        expect(buildRule(draft)).toMatchObject({ response: [{ name: 'Server', operation: 'remove' }] });
    });

    it('keep the fields of another rule type while the type changes', () => {
        const draft = { ...createRuleDraft(URL_REDIRECT_RULE), type: 'block' as const };

        expect(buildRule({ ...draft, type: 'redirect' })).toEqual(URL_REDIRECT_RULE);
    });
});

describe('updateHeaderOp', () => {
    it('changes only the row with the key', () => {
        expect(updateHeaderOp(HEADER_ROWS, 'b', { value: '3' })).toEqual([
            HEADER_ROWS[0],
            { key: 'b', name: 'X-B', operation: 'set', value: '3' },
        ]);
    });
});
