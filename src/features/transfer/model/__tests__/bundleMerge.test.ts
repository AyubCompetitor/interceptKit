import { describe, expect, it } from '@rstest/core';

import { Sources } from '#shared/lib';

import { BUNDLE_PARTS, buildBundleText } from '../bundle.ts';
import { mergeBundle, previewBundleImport } from '../bundleMerge.ts';

import { EXPORTED_AT, makeContent, makeEnvironment, makeMock, makeRule } from './mocks.ts';

const STORED = makeContent({
    rules: [makeRule('r1', Sources.USER, 'Old name'), makeRule('p1', Sources.POLICY)],
    mocks: [makeMock('m1')],
    environments: [makeEnvironment('e1', 'local-token')],
});

const IMPORTED = makeContent({
    rules: [makeRule('r1', Sources.USER, 'New name'), makeRule('p1'), makeRule('r2')],
    environments: [makeEnvironment('e1', ''), makeEnvironment('e2', '')],
});

describe('mergeBundle', () => {
    const { content, counts } = mergeBundle(STORED, IMPORTED);

    it('replaces a record with a known id in place and adds a new one at the end', () => {
        expect(content.rules.map(rule => [rule.id, rule.name])).toEqual([
            ['r1', 'New name'],
            ['p1', 'Block ads'],
            ['r2', 'Block ads'],
        ]);
    });

    it('leaves a record of the policy as it is', () => {
        expect(content.rules[1]?.source).toBe(Sources.POLICY);

        expect(counts.rules).toEqual({ added: 1, replaced: 1, skipped: 1 });
    });

    it('deletes nothing that the file lacks', () => {
        expect(content.mocks).toEqual(STORED.mocks);

        expect(counts.mocks).toEqual({ added: 0, replaced: 0, skipped: 0 });
    });

    it('keeps the secret values of this browser over the empty ones of the file', () => {
        const [replaced, added] = content.environments;

        expect(replaced?.variables[1]?.value).toBe('local-token');

        expect(added?.variables[1]?.value).toBe('');
    });
});

describe('previewBundleImport', () => {
    it('counts what the import of the text would do', () => {
        const text = buildBundleText(IMPORTED, BUNDLE_PARTS, EXPORTED_AT);
        const preview = previewBundleImport(text, STORED);

        expect(preview).toMatchObject({ ok: true, value: { environments: { added: 1, replaced: 1, skipped: 0 } } });
    });

    it('gives the reasons a text cannot be imported', () => {
        expect(previewBundleImport('{', STORED).ok).toBe(false);
    });
});
