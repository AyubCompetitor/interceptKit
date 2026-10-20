export const ENCRYPTED_VALUE = { v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'c2VjcmV0' };

/** Raw plain variable as it comes from storage or an import */
export const makeVariable = (overrides: Record<string, unknown> = {}) => ({
    key: 'baseUrl',
    enabled: true,
    secret: false,
    value: 'https://staging.example.com',
    ...overrides,
});

export const SECRET_VARIABLE = makeVariable({ key: 'token', secret: true, value: ENCRYPTED_VALUE });

export const makeEnvironment = (variables: readonly object[] = [makeVariable(), SECRET_VARIABLE]) => ({
    id: 'e1',
    name: 'Staging',
    variables,
});
