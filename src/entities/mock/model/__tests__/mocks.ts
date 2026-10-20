export const makeMockResponse = (overrides: Record<string, unknown> = {}) => ({
    status: 200,
    headers: [],
    bodyType: 'json',
    body: '{"ok":true}',
    delayMs: 0,
    ...overrides,
});

/** Raw mock as it comes from storage or an import; overrides apply to its response */
export const makeMock = (responseOverrides: Record<string, unknown> = {}) => ({
    id: 'm1',
    name: 'Users',
    enabled: true,
    source: 'user',
    match: { url: { syntaxType: 'filter', value: '||api.example.com/users' }, methods: ['GET'] },
    response: makeMockResponse(responseOverrides),
});
