import { MAX_BUNDLE_LENGTH } from '../model/bundle.ts';
import type { BundleCounts } from '../model/bundleMerge.ts';

import { defineMethod, object, string } from '#shared/lib';

export interface BundleImportParams {
    /** Text of the export file */
    readonly text: string;
}

export interface BundleImportResult {
    /** What the import did to each list */
    readonly counts: BundleCounts;
}

const bundleImportParams = object({ text: string({ minLength: 1, maxLength: MAX_BUNDLE_LENGTH }) });

/** The background parses the text again and writes every list in one step */
export const transferRpc = {
    import: defineMethod<BundleImportParams, BundleImportResult>('transfer/import', bundleImportParams),
} as const;
