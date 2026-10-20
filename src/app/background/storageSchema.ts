import {
    defineStoreItem,
    MigrationStatuses,
    number,
    runMigrations,
    Stores,
    type Migration,
    type MigrationOutcome,
} from '#shared/lib';
import { readStoreData, readItem, writeStoreData, writeItem } from '#shared/platform';

export const SCHEMA_VERSION = 1;

const MIGRATIONS: readonly Migration[] = [];

const schemaVersionItem = defineStoreItem({
    key: 'schemaVersion',
    area: Stores.LOCAL,
    fallback: 0,
    validator: number({ integer: true, min: 1 }),
});

const warnNewerStatus = (result: MigrationOutcome) =>
    console.warn(`[storage] schema ${result.version} is newer than this build (${SCHEMA_VERSION}); left untouched`);

export const migrateStorage = async (): Promise<void> => {
    const storedVersion = await readItem(schemaVersionItem);

    const isCurrentSchema = storedVersion === SCHEMA_VERSION;

    if (isCurrentSchema) {
        return;
    }

    const data = await readStoreData(Stores.LOCAL);
    const version = storedVersion === 0 ? undefined : storedVersion;
    const result = runMigrations(data, version, MIGRATIONS, SCHEMA_VERSION);

    const isNewerMigration = result.status === MigrationStatuses.NEWER;
    const isMigrated = result.status === MigrationStatuses.MIGRATED;

    if (isNewerMigration) {
        warnNewerStatus(result);

        return;
    }

    if (isMigrated) {
        await writeStoreData(Stores.LOCAL, result.data);
    }

    await writeItem(schemaVersionItem, result.version);
};
