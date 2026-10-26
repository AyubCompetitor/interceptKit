import { describe, expect, it } from '@rstest/core';

import { Sources } from '#shared/lib';

import { BUNDLE_PARTS, BundleParts, buildBundleText } from '../bundle.ts';
import { readPresetBundle, replacePolicyRecords } from '../preset.ts';

import { EXPORTED_AT, makeCollection, makeContent, makeEnvironment, makeMock, makeRule } from './mocks.ts';

const RECORDS_TEXT = buildBundleText(
    makeContent({ rules: [makeRule('r1')], mocks: [makeMock('m1')] }),
    [BundleParts.RULES, BundleParts.MOCKS],
    EXPORTED_AT,
);

const WITH_ENVIRONMENTS_TEXT = buildBundleText(
    makeContent({
        rules: [makeRule('r1')],
        environments: [makeEnvironment('e1')],
        collections: [makeCollection('c1')],
    }),
    BUNDLE_PARTS,
    EXPORTED_AT,
);

const getIssuePaths = (text: string): string[] => readPresetBundle(text).issues.map(issue => issue.path);

describe('readPresetBundle', () => {
    it('brings nothing without a bundle', () => {
        expect(readPresetBundle(undefined)).toEqual({ issues: [] });
    });

    it('makes the records of the bundle records of the policy, with ids of their own', () => {
        expect(readPresetBundle(RECORDS_TEXT)).toEqual({
            content: {
                rules: [{ ...makeRule('r1'), id: 'policy:r1', source: Sources.POLICY }],
                mocks: [{ ...makeMock('m1'), id: 'policy:m1', source: Sources.POLICY }],
            },
            issues: [],
        });
    });

    it('leaves the environments and the collections out and says so', () => {
        const { content } = readPresetBundle(WITH_ENVIRONMENTS_TEXT);

        expect(content?.rules).toHaveLength(1);

        expect(getIssuePaths(WITH_ENVIRONMENTS_TEXT)).toEqual([
            '$.presetBundle.environments',
            '$.presetBundle.collections',
        ]);
    });

    it.each([
        { name: 'text that is not JSON', text: '{', path: '$.presetBundle' },
        {
            name: 'a broken record',
            text: '{"format":"xrequest","version":1,"rules":[{"id":"r1"}]}',
            path: '$.presetBundle.rules[0]',
        },
        {
            name: 'an id of the policy in the file',
            text: buildBundleText(makeContent({ rules: [makeRule('policy:r1')] }), BUNDLE_PARTS, EXPORTED_AT),
            path: '$.presetBundle.rules[0]',
        },
    ])('brings nothing from $name and names the place inside the policy', ({ text, path }) => {
        expect(readPresetBundle(text).content).toBeUndefined();

        expect(getIssuePaths(text)[0]).toContain(path);
    });
});

describe('replacePolicyRecords', () => {
    it('puts the records of the policy first and drops the ones it no longer brings', () => {
        const stored = [makeRule('u1'), makeRule('policy:old', Sources.POLICY), makeRule('u2')];
        const preset = [makeRule('policy:new', Sources.POLICY)];

        const ids = replacePolicyRecords(stored, preset).map(rule => rule.id);

        expect(ids).toEqual(['policy:new', 'u1', 'u2']);
    });
});
