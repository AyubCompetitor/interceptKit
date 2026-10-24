import { describe, expect, it } from '@rstest/core';

import type { Environment } from '../environment.ts';
import {
    findEnvironment,
    hideSecretValues,
    mergeImportedEnvironment,
    removeEnvironment,
    upsertEnvironment,
} from '../environmentList.ts';

const STAGING: Environment = { id: 'staging', name: 'Staging', variables: [] };

const PRODUCTION: Environment = { id: 'production', name: 'Production', variables: [] };

const ENVIRONMENTS = [STAGING, PRODUCTION];

describe('environment lists', () => {
    it('add a new environment at the end', () => {
        const local: Environment = { id: 'local', name: 'Local', variables: [] };

        expect(upsertEnvironment(ENVIRONMENTS, local)).toEqual([STAGING, PRODUCTION, local]);
    });

    it('replace an environment in its place', () => {
        const renamed = { ...STAGING, name: 'Stage' };

        expect(upsertEnvironment(ENVIRONMENTS, renamed)).toEqual([renamed, PRODUCTION]);
    });

    it('remove an environment by id', () => {
        expect(removeEnvironment(ENVIRONMENTS, 'staging')).toEqual([PRODUCTION]);
    });

    it.each([
        { name: 'the chosen one', id: 'production', found: PRODUCTION },
        { name: 'nothing without a choice', id: undefined, found: undefined },
        { name: 'nothing once it is deleted', id: 'deleted', found: undefined },
    ])('find $name', ({ id, found }) => {
        expect(findEnvironment(ENVIRONMENTS, id)).toBe(found);
    });
});

const withToken = (value: string): Environment => ({
    id: 'staging',
    name: 'Staging',
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value, enabled: true, secret: true },
    ],
});

describe('hideSecretValues', () => {
    it('empties the values of secrets and keeps the variables', () => {
        const values = hideSecretValues(withToken('abc')).variables.map(variable => variable.value);

        expect(values).toEqual(['https://staging.example.com', '']);
    });
});

describe('mergeImportedEnvironment', () => {
    it.each([
        { name: 'keeps the stored value of a secret the file brings empty', imported: '', value: 'abc' },
        { name: 'takes a secret value the file does bring', imported: 'new', value: 'new' },
    ])('$name', ({ imported, value }) => {
        const merged = mergeImportedEnvironment(withToken('abc'), withToken(imported));

        expect(merged.variables[1]?.value).toBe(value);
    });
});
