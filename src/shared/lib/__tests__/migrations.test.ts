import { describe, expect, it } from '@rstest/core';

import { MigrationStatuses, runMigrations, type Migration } from '../migrations.ts';

const MIGRATIONS: Migration[] = [
    { version: 2, migrate: data => ({ ...data, rules: data['rules'] ?? [] }) },
    { version: 3, migrate: data => ({ ...data, migratedTo3: true }) },
];

describe('runMigrations', () => {
    it('treats a missing version as a fresh install', () => {
        expect(runMigrations({}, undefined, MIGRATIONS, 3)).toEqual({ status: MigrationStatuses.FRESH, version: 3 });
    });

    it('does nothing when data is current', () => {
        expect(runMigrations({ a: 1 }, 3, MIGRATIONS, 3)).toEqual({ status: MigrationStatuses.CURRENT, version: 3 });
    });

    it('applies only the pending migrations in order', () => {
        expect(runMigrations({ a: 1 }, 2, MIGRATIONS, 3)).toEqual({
            status: MigrationStatuses.MIGRATED,
            version: 3,
            data: { a: 1, migratedTo3: true },
        });

        expect(runMigrations({}, 1, MIGRATIONS, 3)).toEqual({
            status: MigrationStatuses.MIGRATED,
            version: 3,
            data: { rules: [], migratedTo3: true },
        });
    });

    it('leaves data from a newer build untouched', () => {
        expect(runMigrations({ a: 1 }, 7, MIGRATIONS, 3)).toEqual({ status: MigrationStatuses.NEWER, version: 7 });
    });

    it.each([
        { reason: 'a gap in the chain', migrations: [MIGRATIONS[1]!], latest: 2 },
        { reason: 'a latest version past the chain', migrations: MIGRATIONS, latest: 4 },
    ])('rejects $reason', ({ migrations, latest }) => {
        expect(() => runMigrations({}, 1, migrations, latest)).toThrow();
    });
});
