import { describe, expect, it } from '@rstest/core';

import { Sources } from '#shared/lib';

import { BUNDLE_PARTS, BundleParts, buildBundleFileName, buildBundleText, parseBundle } from '../bundle.ts';

import { EXPORTED_AT, makeCollection, makeContent, makeEnvironment, makeMock, makeRule } from './mocks.ts';

const CONTENT = makeContent({
    rules: [makeRule('r1'), makeRule('r2', Sources.POLICY)],
    mocks: [makeMock('m1')],
    environments: [makeEnvironment('e1')],
});

const TEXT = buildBundleText(CONTENT, BUNDLE_PARTS, EXPORTED_AT);

const getParseError = (text: string): string => {
    const result = parseBundle(text);

    if (result.ok) {
        throw new Error('expected the text to be refused');
    }

    return result.issues.map(issue => `${issue.path}: ${issue.message}`).join('; ');
};

describe('buildBundleText', () => {
    const file = JSON.parse(TEXT);

    it('starts with the head and ends with a line break', () => {
        expect(Object.keys(file).slice(0, 3)).toEqual(['format', 'version', 'exportedAt']);

        expect(TEXT.endsWith('}\n')).toBe(true);

        expect(TEXT).toContain('\n    "format": "xrequest"');
    });

    it('leaves out the source and the records of the policy', () => {
        expect(file.rules).toHaveLength(1);

        expect(file.rules[0]).not.toHaveProperty('source');
    });

    it('writes the keys of records in order, so a diff shows only real changes', () => {
        expect(Object.keys(file.rules[0])).toEqual(['enabled', 'id', 'match', 'name', 'type']);
    });

    it('empties the values of secrets and keeps the other values', () => {
        expect(file.environments[0].variables.map((variable: { value: string }) => variable.value)).toEqual([
            'https://staging.example.com',
            '',
        ]);
    });

    it('carries only the chosen lists', () => {
        const rulesOnly = JSON.parse(buildBundleText(CONTENT, [BundleParts.RULES], EXPORTED_AT));

        expect(Object.keys(rulesOnly)).toEqual(['format', 'version', 'exportedAt', 'rules']);
    });
});

describe('buildBundleFileName', () => {
    it('names the file after the day of the export', () => {
        expect(buildBundleFileName(EXPORTED_AT)).toBe('xrequest-2026-10-24.json');
    });
});

describe('parseBundle', () => {
    it('reads an export back as records of the user', () => {
        expect(parseBundle(TEXT)).toEqual({
            ok: true,
            value: makeContent({
                rules: [makeRule('r1')],
                mocks: [makeMock('m1')],
                environments: [makeEnvironment('e1', '')],
            }),
        });
    });

    it('carries the collections and reads them back', () => {
        const content = makeContent({ collections: [makeCollection('c1')] });
        const text = buildBundleText(content, [BundleParts.COLLECTIONS], EXPORTED_AT);

        expect(parseBundle(text)).toEqual({ ok: true, value: content });
    });

    it('reads a file with some lists only', () => {
        const text = JSON.stringify({ format: 'xrequest', version: 1 });

        expect(parseBundle(text)).toEqual({ ok: true, value: makeContent() });
    });

    it.each([
        { name: 'text that is not JSON', text: '{', error: 'not JSON' },
        { name: 'JSON of something else', text: '{"rules":[]}', error: 'not an XRequest export' },
        { name: 'a newer version', text: '{"format":"xrequest","version":3}', error: 'newer version' },
        { name: 'an unknown field', text: '{"format":"xrequest","version":1,"extra":1}', error: '$.extra' },
        {
            name: 'a broken record, with its path',
            text: '{"format":"xrequest","version":1,"rules":[{"id":"r1"}]}',
            error: '$.rules[0]',
        },
        {
            name: 'two records with one id',
            text: buildBundleText(makeContent({ rules: [makeRule('r1'), makeRule('r1')] }), BUNDLE_PARTS, EXPORTED_AT),
            error: 'duplicate',
        },
    ])('refuses $name', ({ text, error }) => {
        expect(getParseError(text)).toContain(error);
    });

    it('refuses a file over 5 MB before reading it', () => {
        expect(getParseError(' '.repeat(5_000_001))).toContain('larger than 5 MB');
    });
});
