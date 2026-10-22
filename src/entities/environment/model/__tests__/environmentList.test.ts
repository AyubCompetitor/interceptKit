import { describe, expect, it } from '@rstest/core';

import type { Environment } from '../environment.ts';
import { findEnvironment, removeEnvironment, upsertEnvironment } from '../environmentList.ts';

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
