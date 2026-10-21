import { HttpMethods, Sources, SyntaxTypes } from '#shared/lib';

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
    source: Sources.USER,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/users' }, methods: [HttpMethods.GET] },
    response: makeMockResponse(responseOverrides),
});
