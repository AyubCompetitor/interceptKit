import { mergeImportedEnvironment, type Environment } from '#entities/environment';
import type { Mock } from '#entities/mock';
import type { Collection } from '#entities/request';
import type { Rule } from '#entities/rule';
import { ok, Sources, type Result } from '#shared/lib';

import { BundleParts, parseBundle, type BundleContent, type BundlePart } from './bundle.ts';

/** What an import does to one list */
export interface MergeCounts {
    /** Records with a new id */
    readonly added: number;
    /** Records that replace the one with their id */
    readonly replaced: number;
    /** Records whose id belongs to a record of the policy, which an import never touches */
    readonly skipped: number;
}

export type BundleCounts = Readonly<Record<BundlePart, MergeCounts>>;

/** The lists after an import, and what it did to each of them */
export interface BundleMerge {
    /** Lists to store */
    readonly content: BundleContent;
    /** What changed in each list */
    readonly counts: BundleCounts;
}

interface MergedList<T> {
    /** The list to store */
    readonly items: T[];
    /** What changed in it */
    readonly counts: MergeCounts;
}

/** How one kind of record merges */
interface MergeRules<T> {
    /** Whether the stored record must stay as it is */
    readonly isLocked: (record: T) => boolean;
    /** The stored record and the imported one with the same id, as one */
    readonly combine: (stored: T, imported: T) => T;
}

const NOT_FOUND = -1;

/** Nothing is deleted: a new id joins the end, a known id is replaced in place; an index by id keeps it one pass */
const mergeById = <T extends { readonly id: string }>(
    stored: readonly T[],
    imported: readonly T[],
    rules: MergeRules<T>,
): MergedList<T> => {
    const items = [...stored];
    const indexById = new Map(items.map((item, idx) => [item.id, idx]));
    let added = 0;
    let replaced = 0;
    let skipped = 0;

    for (const record of imported) {
        const idx = indexById.get(record.id) ?? NOT_FOUND;
        const storedRecord = items[idx];

        if (!storedRecord) {
            indexById.set(record.id, items.length);
            items.push(record);
            added += 1;
            continue;
        }

        if (rules.isLocked(storedRecord)) {
            skipped += 1;
            continue;
        }

        items[idx] = rules.combine(storedRecord, record);
        replaced += 1;
    }

    return {
        items,
        counts: {
            added,
            replaced,
            skipped,
        },
    };
};

const isPolicyRecord = (record: Rule | Mock): boolean => record.source === Sources.POLICY;

const takeImported = <T>(_stored: T, imported: T): T => imported;

const RECORD_RULES = {
    isLocked: isPolicyRecord,
    combine: takeImported,
} as const;

const ENVIRONMENT_RULES: MergeRules<Environment> = {
    isLocked: () => false,
    combine: mergeImportedEnvironment,
};

const COLLECTION_RULES: MergeRules<Collection> = {
    isLocked: () => false,
    combine: takeImported,
};

export const mergeBundle = (stored: BundleContent, imported: BundleContent): BundleMerge => {
    const rules = mergeById<Rule>(stored.rules, imported.rules, RECORD_RULES);
    const mocks = mergeById<Mock>(stored.mocks, imported.mocks, RECORD_RULES);
    const environments = mergeById(stored.environments, imported.environments, ENVIRONMENT_RULES);
    const collections = mergeById(stored.collections, imported.collections, COLLECTION_RULES);

    return {
        content: {
            rules: rules.items,
            mocks: mocks.items,
            environments: environments.items,
            collections: collections.items,
        },
        counts: {
            [BundleParts.RULES]: rules.counts,
            [BundleParts.MOCKS]: mocks.counts,
            [BundleParts.ENVIRONMENTS]: environments.counts,
            [BundleParts.COLLECTIONS]: collections.counts,
        },
    };
};

/** What importing the text would do to the lists stored now, or why it cannot be imported */
export const previewBundleImport = (text: string, stored: BundleContent): Result<BundleCounts> => {
    const parsed = parseBundle(text);

    if (!parsed.ok) {
        return parsed;
    }

    return ok(mergeBundle(stored, parsed.value).counts);
};
