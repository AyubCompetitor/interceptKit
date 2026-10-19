import { defineStore, MigrationStatuses, number, runMigrations, Stores, type Migration } from '#shared/lib';
import { readArea, readItem, replaceArea, writeItem } from '#shared/platform';

export const SCHEMA_VERSION = 1;

const MIGRATIONS: readonly Migration[] = [];

const schemaVersionItem = defineStore({
    key: 'schemaVersion',
    area: Stores.LOCAL,
    fallback: 0,
    validator: number({ integer: true, min: 1 }),
});

export const migrateStorage = async (): Promise<void> => {
    const storedVersion = await readItem(schemaVersionItem);

    if (storedVersion === SCHEMA_VERSION) {
        return;
    }

    const data = await readArea(Stores.LOCAL);
    const version = storedVersion === 0 ? undefined : storedVersion;

    const outcome = runMigrations(data, version, MIGRATIONS, SCHEMA_VERSION);

    if (outcome.status === MigrationStatuses.NWR) {
        console.warn(
            `[storage] schema ${outcome.version} is newer than this build (${SCHEMA_VERSION}); left untouched`,
        );

        return;
    }

    if (outcome.status === 'migrated') {
        await replaceArea(Stores.LOCAL, outcome.data);
    }

    await writeItem(schemaVersionItem, outcome.version);
};
