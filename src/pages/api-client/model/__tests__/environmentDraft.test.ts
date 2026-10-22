import { describe, expect, it } from '@rstest/core';

import { buildEnvironment, createEnvironmentDraft, updateVariableDraft } from '../environmentDraft.ts';

import { environmentValidator, type Environment } from '#entities/environment';
import { validate } from '#shared/lib';

const ENCRYPTED_VALUE = { v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'c2VjcmV0' } as const;

const STAGING: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value: ENCRYPTED_VALUE, enabled: true, secret: true },
    ],
};

describe('environment drafts', () => {
    it('turn an environment into a form and back unchanged', () => {
        expect(buildEnvironment(createEnvironmentDraft(STAGING))).toEqual(STAGING);
    });

    it('start a new environment with one empty variable and a valid id', () => {
        const draft = createEnvironmentDraft(undefined);
        const named = buildEnvironment({ ...draft, name: 'Local', variables: [] });

        expect(draft.variables).toHaveLength(1);

        expect(validate(environmentValidator, named).ok).toBe(true);
    });

    it('trim the name and the variable names', () => {
        const draft = createEnvironmentDraft(STAGING);
        const [first] = draft.variables;
        const variables = updateVariableDraft(draft.variables, first?.rowId ?? '', { key: ' host ' });

        const environment = buildEnvironment({ ...draft, name: ' Stage ', variables });

        expect(environment).toMatchObject({ name: 'Stage', variables: [{ key: 'host' }, { key: 'token' }] });
    });

    it('replace an encrypted value once a new one is typed', () => {
        const draft = createEnvironmentDraft(STAGING);
        const [, token] = draft.variables;
        const variables = updateVariableDraft(draft.variables, token?.rowId ?? '', { value: 'plain' });

        expect(buildEnvironment({ ...draft, variables }).variables[1]?.value).toBe('plain');
    });
});
