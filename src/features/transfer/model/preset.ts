import type { Mock } from '#entities/mock';
import type { Rule } from '#entities/rule';
import { POLICY_ID_PREFIX, Sources, type Issue } from '#shared/lib';

import { parseBundle, type BundleContent } from './bundle.ts';

/** Records the administrator's policy brings */
export interface PresetContent {
    /** Rules of the policy, in their order */
    readonly rules: readonly Rule[];
    /** Mocks of the policy, in their order */
    readonly mocks: readonly Mock[];
}

/** The policy's bundle, read */
export interface PresetRead {
    /** What the policy brings; none without a bundle or when the bundle is broken */
    readonly content?: PresetContent;
    /** Problems of the bundle, with paths inside the policy */
    readonly issues: readonly Issue[];
}

export const EMPTY_PRESET: PresetContent = {
    rules: [],
    mocks: [],
};

const PRESET_PATH = '$.presetBundle';

const IGNORED_PARTS = {
    environments: 'environments are not taken from the policy, ignored',
    collections: 'collections are not taken from the policy yet, ignored',
} as const;

type IgnoredPart = keyof typeof IGNORED_PARTS;

const mapIssueToPolicy = (issue: Issue): Issue => ({
    path: `${PRESET_PATH}${issue.path.slice(1)}`,
    message: issue.message,
});

const mapRecordToPolicy = <T extends Rule | Mock>(record: T): T => ({
    ...record,
    id: `${POLICY_ID_PREFIX}${record.id}`,
    source: Sources.POLICY,
});

const getIgnoredIssues = (content: BundleContent): Issue[] => {
    const parts: IgnoredPart[] = ['environments', 'collections'];
    const filledParts = parts.filter(part => content[part].length > 0);

    return filledParts.map(part => ({
        path: `${PRESET_PATH}.${part}`,
        message: IGNORED_PARTS[part],
    }));
};

export const readPresetBundle = (text: NotRequired<string>): PresetRead => {
    if (text === undefined) {
        return {
            issues: [],
        };
    }

    const parsed = parseBundle(text);

    if (!parsed.ok) {
        return {
            issues: parsed.issues.map(mapIssueToPolicy),
        };
    }

    const { rules, mocks } = parsed.value;

    return {
        content: {
            rules: rules.map(mapRecordToPolicy),
            mocks: mocks.map(mapRecordToPolicy),
        },
        issues: getIgnoredIssues(parsed.value),
    };
};

const isUserRecord = (record: Rule | Mock): boolean => record.source === Sources.USER;

export const replacePolicyRecords = <T extends Rule | Mock>(stored: readonly T[], preset: readonly T[]): T[] => [
    ...preset,
    ...stored.filter(isUserRecord),
];
