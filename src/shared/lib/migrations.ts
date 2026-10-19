export type StoredData = Readonly<Record<string, unknown>>;

export enum MigrationStatuses {
    FRESH = 'fresh',
    CURR = 'current',
    MGRTD = 'migrated',
    NWR = 'newer',
}

/** One step of the storage schema upgrade */
export interface Migration {
    /** Schema version this migration produces */
    readonly version: number;
    /** Converts data of the previous version */
    readonly migrate: (data: StoredData) => StoredData;
}

export type FreshResult = { readonly status: MigrationStatuses.FRESH; readonly version: number };

export type CurrentResult = { readonly status: MigrationStatuses.CURR; readonly version: number };

export type MigratedResult = { readonly status: MigrationStatuses.MGRTD; readonly version: number; readonly data: StoredData };

export type NeverResult = { readonly status: MigrationStatuses.NWR; readonly version: number };

export type MigrationOutcome = FreshResult | CurrentResult | MigratedResult | NeverResult;

const assertMigrationChain = (migrations: readonly Migration[], latest: number): void => {
    migrations.forEach((migration, idx) => {
        if (migration.version !== idx + 2) {
            throw new Error(`Migration #${idx} must produce version ${idx + 2}`);
        }
    });

    if (latest !== migrations.length + 1) {
        throw new Error(`Latest schema version ${latest} does not match the migration chain`);
    }
};

export const runMigrations = (
    data: StoredData,
    storedVersion: NotRequired<number>,
    migrations: readonly Migration[],
    latest: number,
): MigrationOutcome => {
    assertMigrationChain(migrations, latest);

    if (storedVersion === undefined) {
        return {
            status: MigrationStatuses.FRESH,
            version: latest,
        };
    }

    if (storedVersion > latest) {
        return {
            status: MigrationStatuses.NWR,
            version: storedVersion,
        };
    }

    if (storedVersion === latest) {
        return {
            status: MigrationStatuses.CURR,
            version: latest,
        };
    }

    const migrated = migrations.reduce(
        (current, migration) => (migration.version > storedVersion ? migration.migrate(current) : current),
        data,
    );

    return {
        status: MigrationStatuses.MGRTD,
        version: latest,
        data: migrated,
    };
};
