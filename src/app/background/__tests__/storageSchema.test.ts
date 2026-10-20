import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';

import { installFakeStorage } from '../../../shared/platform/__tests__/mocks.ts';
import { migrateStorage, SCHEMA_VERSION } from '../storageSchema.ts';

describe('migrateStorage', () => {
    let data: Record<string, unknown>;

    beforeEach(() => {
        data = installFakeStorage();
    });

    afterEach(() => {
        rs.restoreAllMocks();
    });

    it('stamps the current schema version on a fresh install', async () => {
        await migrateStorage();

        expect(data).toEqual({ schemaVersion: SCHEMA_VERSION });
    });

    it('leaves current data untouched', async () => {
        data['schemaVersion'] = SCHEMA_VERSION;
        data['rules'] = [];

        await migrateStorage();

        expect(data).toEqual({ schemaVersion: SCHEMA_VERSION, rules: [] });
    });

    it('does not touch data written by a newer build', async () => {
        const warn = rs.spyOn(console, 'warn').mockImplementation(() => undefined);

        data['schemaVersion'] = SCHEMA_VERSION + 1;
        data['rules'] = ['from a newer build'];

        await migrateStorage();

        expect(data).toEqual({ schemaVersion: SCHEMA_VERSION + 1, rules: ['from a newer build'] });

        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('treats a corrupted version as a fresh install', async () => {
        rs.spyOn(console, 'warn').mockImplementation(() => undefined);

        data['schemaVersion'] = 'broken';

        await migrateStorage();

        expect(data['schemaVersion']).toBe(SCHEMA_VERSION);
    });
});
