import { environmentValidator, type Environment } from '#entities/environment';
import { collectionValidator, type Collection } from '#entities/request';
import { object, ok, optional, validate, type Result } from '#shared/lib';

import { listImportGaps, type ImportGap, type ImportGapTallies } from './importGaps.ts';

/** What a file of another tool brings into the API client */
export interface ImportedFile {
    /** The collection the file describes */
    readonly collection?: Collection;
    /** The environment of the file, or one made of its variables */
    readonly environment?: Environment;
    /** What the file has that is not carried over */
    readonly gaps: readonly ImportGap[];
}

/** The records the API client stores, checked as it checks its own */
const importedRecords = object({
    collection: optional(collectionValidator),
    environment: optional(environmentValidator),
});

export const checkImportedFile = (
    records: Pick<ImportedFile, 'collection' | 'environment'>,
    gaps: ImportGapTallies,
): Result<ImportedFile> => {
    const checked = validate(importedRecords, records);

    if (!checked.ok) {
        return checked;
    }

    return ok({
        ...checked.value,
        gaps: listImportGaps(gaps),
    });
};
