import { describe, expect, it } from '@rstest/core';

import { buildCurlExport } from '../curlExport.ts';
import { buildApiRequest } from '../requestDraft.ts';
import { NO_SECRETS } from '../vaultSecrets.ts';

import type { Environment } from '#entities/environment';

import { makeDraft, makeRow } from './mocks.ts';

const ENCRYPTED_VALUE = { v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'AAAA' } as const;

const STAGING: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value: 'abc', enabled: true, secret: true },
        { key: 'apiKey', value: ENCRYPTED_VALUE, enabled: true, secret: true },
    ],
};

const REQUEST = buildApiRequest(
    makeDraft({
        url: '{{baseUrl}}/users',
        headers: [makeRow('Authorization', 'Bearer {{token}}'), makeRow('X-Api-Key', '{{apiKey}}')],
    }),
);

const OPENED_SECRETS = new Map([['apiKey', 'opened']]);

const WITHOUT_SECRETS = { isWithSecrets: false, isVaultRequired: false };

const WITH_SECRETS = { isWithSecrets: true, isVaultRequired: false };

describe('buildCurlExport', () => {
    it('fills in plain variables and leaves secrets as typed', () => {
        const { command, missingNames } = buildCurlExport(REQUEST, STAGING, OPENED_SECRETS, WITHOUT_SECRETS);

        expect(command).toContain("curl 'https://staging.example.com/users'");

        expect(command).toContain("-H 'Authorization: Bearer {{token}}'");

        expect(missingNames).toEqual(['token', 'apiKey']);
    });

    it('fills in typed and opened secrets when asked to', () => {
        const { command, missingNames } = buildCurlExport(REQUEST, STAGING, OPENED_SECRETS, WITH_SECRETS);

        expect(command).toContain("-H 'Authorization: Bearer abc'");

        expect(command).toContain("-H 'X-Api-Key: opened'");

        expect(missingNames).toEqual([]);
    });

    it('leaves encrypted secrets as typed while the vault is locked', () => {
        const { missingNames } = buildCurlExport(REQUEST, STAGING, NO_SECRETS, WITH_SECRETS);

        expect(missingNames).toEqual(['apiKey']);
    });

    it('keeps typed secrets out when the policy requires the vault', () => {
        const options = { isWithSecrets: true, isVaultRequired: true };

        const { command } = buildCurlExport(REQUEST, STAGING, OPENED_SECRETS, options);

        expect(command).toContain("-H 'Authorization: Bearer {{token}}'");

        expect(command).toContain("-H 'X-Api-Key: opened'");
    });

    it('builds the command without an environment', () => {
        const { command, missingNames } = buildCurlExport(REQUEST, undefined, NO_SECRETS, WITHOUT_SECRETS);

        expect(command).toContain("curl '{{baseUrl}}/users'");

        expect(missingNames).toEqual(['baseUrl', 'token', 'apiKey']);
    });
});
