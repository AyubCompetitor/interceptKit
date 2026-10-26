import { environmentsValidator, hideSecretValues, type Environment } from '#entities/environment';
import { mocksValidator, type Mock } from '#entities/mock';
import { collectionsValidator, type Collection } from '#entities/request';
import { rulesValidator, type Rule } from '#entities/rule';
import {
    fail,
    literal,
    MigrationStatuses,
    number,
    object,
    ok,
    optional,
    runMigrations,
    Sources,
    string,
    validate,
    type Migration,
    type Result,
    type StoredData,
    type Validator,
} from '#shared/lib';

/** The lists a bundle can carry; the values are also the keys of the file */
export enum BundleParts {
    RULES = 'rules',
    MOCKS = 'mocks',
    ENVIRONMENTS = 'environments',
    COLLECTIONS = 'collections',
}

export type BundlePart = `${BundleParts}`;

export const BUNDLE_PARTS = Object.values(BundleParts);

/** What a bundle carries, in the shape the storage keeps */
export interface BundleContent {
    /** Rules in their order */
    readonly rules: readonly Rule[];
    /** Mocks in their order */
    readonly mocks: readonly Mock[];
    /** Environments in their order */
    readonly environments: readonly Environment[];
    /** Collections of the API client */
    readonly collections: readonly Collection[];
}

export const BUNDLE_FORMAT = 'xrequest';

export const BUNDLE_VERSION = 2;

/** A bundle fits into storage.local, which holds 10 MB in all */
export const MAX_BUNDLE_LENGTH = 5_000_000;

export const EMPTY_BUNDLE_CONTENT: BundleContent = {
    rules: [],
    mocks: [],
    environments: [],
    collections: [],
};

const BUNDLE_MIGRATIONS: readonly Migration[] = [{ version: 2, migrate: data => data }];

const JSON_INDENT = 4;

const FILE_END = '\n';

const ROOT_PATH = '$';

const FILE_NAME = {
    PREFIX: 'xrequest-',
    EXTENSION: '.json',
    DATE_LENGTH: 10,
} as const;

const BUNDLE_ERRORS = {
    TOO_LARGE: 'the file is larger than 5 MB',
    NOT_JSON: 'the file is not JSON',
    NOT_BUNDLE: 'the file is not an XRequest export',
    NEWER_VERSION: 'the file comes from a newer version of XRequest',
} as const;

const isPlainObject = (value: unknown): value is StoredData =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** The file has no source: what it brings is the user's own */
const addUserSource = (record: unknown): unknown => {
    if (!isPlainObject(record)) {
        return record;
    }

    return {
        ...record,
        source: Sources.USER,
    };
};

const withUserSource = <T>(listValidator: Validator<T[]>): Validator<T[]> => {
    return (input, path) => {
        if (!Array.isArray(input)) {
            return listValidator(input, path);
        }

        return listValidator(input.map(addUserSource), path);
    };
};

const bundleFile = object({
    format: literal(BUNDLE_FORMAT),
    version: literal(BUNDLE_VERSION),
    exportedAt: optional(string({ maxLength: 64 })),
    rules: optional(withUserSource(rulesValidator)),
    mocks: optional(withUserSource(mocksValidator)),
    environments: optional(environmentsValidator),
    collections: optional(collectionsValidator),
});

const bundleVersion = number({ integer: true, min: 1 });

const omitSource = (record: Rule | Mock): StoredData => {
    const entries = Object.entries(record).filter(([key]) => key !== 'source');

    return Object.fromEntries(entries);
};

/** Records of the user without their source, in one pass over lists of thousands */
const exportUserRecords = (records: readonly (Rule | Mock)[]): StoredData[] => {
    const exported: StoredData[] = [];

    for (const record of records) {
        if (record.source !== Sources.USER) {
            continue;
        }

        exported.push(omitSource(record));
    }

    return exported;
};

const buildBundleLists = (content: BundleContent, parts: readonly BundlePart[]): StoredData => ({
    ...(parts.includes(BundleParts.RULES) && { rules: exportUserRecords(content.rules) }),
    ...(parts.includes(BundleParts.MOCKS) && { mocks: exportUserRecords(content.mocks) }),
    ...(parts.includes(BundleParts.ENVIRONMENTS) && { environments: content.environments.map(hideSecretValues) }),
    ...(parts.includes(BundleParts.COLLECTIONS) && { collections: content.collections }),
});

/** Records go out with sorted keys, so a diff in git shows only real changes; the head keeps its order */
const sortRecordKeys = (key: string, value: unknown): unknown => {
    if (key === '' || !isPlainObject(value)) {
        return value;
    }

    const names = Object.keys(value).toSorted();

    return Object.fromEntries(names.map(name => [name, value[name]]));
};

/** The text of an export: the chosen lists, without policy records and without secret values */
export const buildBundleText = (content: BundleContent, parts: readonly BundlePart[], exportedAt: string): string => {
    const file = {
        format: BUNDLE_FORMAT,
        version: BUNDLE_VERSION,
        exportedAt,
        ...buildBundleLists(content, parts),
    };

    return `${JSON.stringify(file, sortRecordKeys, JSON_INDENT)}${FILE_END}`;
};

/** xrequest-2026-10-24.json for an export made that day */
export const buildBundleFileName = (exportedAt: string): string =>
    `${FILE_NAME.PREFIX}${exportedAt.slice(0, FILE_NAME.DATE_LENGTH)}${FILE_NAME.EXTENSION}`;

const parseJson = (text: string): Result<unknown> => {
    try {
        return ok(JSON.parse(text));
    } catch {
        return fail(ROOT_PATH, BUNDLE_ERRORS.NOT_JSON);
    }
};

/** Brings a file of an older version of the format to the current one */
const migrateBundle = (data: StoredData): Result<StoredData> => {
    const versionResult = bundleVersion(data['version'], `${ROOT_PATH}.version`);

    if (!versionResult.ok) {
        return versionResult;
    }

    const outcome = runMigrations(data, versionResult.value, BUNDLE_MIGRATIONS, BUNDLE_VERSION);

    if (outcome.status === MigrationStatuses.NEWER) {
        return fail(ROOT_PATH, BUNDLE_ERRORS.NEWER_VERSION);
    }

    if (outcome.status === MigrationStatuses.MIGRATED) {
        return ok({ ...outcome.data, version: BUNDLE_VERSION });
    }

    return ok(data);
};

/** What the text of an export carries, or every reason it cannot be imported */
export const parseBundle = (text: string): Result<BundleContent> => {
    if (text.length > MAX_BUNDLE_LENGTH) {
        return fail(ROOT_PATH, BUNDLE_ERRORS.TOO_LARGE);
    }

    const jsonResult = parseJson(text);

    if (!jsonResult.ok) {
        return jsonResult;
    }

    const data = jsonResult.value;
    const isBundle = isPlainObject(data) && data['format'] === BUNDLE_FORMAT;

    if (!isBundle) {
        return fail(ROOT_PATH, BUNDLE_ERRORS.NOT_BUNDLE);
    }

    const migrated = migrateBundle(data);

    if (!migrated.ok) {
        return migrated;
    }

    const fileResult = validate(bundleFile, migrated.value);

    if (!fileResult.ok) {
        return fileResult;
    }

    const { rules = [], mocks = [], environments = [], collections = [] } = fileResult.value;

    return ok({
        rules,
        mocks,
        environments,
        collections,
    });
};
