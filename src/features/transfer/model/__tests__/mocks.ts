import type { Environment } from '#entities/environment';
import { MockBodyTypes, type Mock } from '#entities/mock';
import { RuleTypes, type Rule } from '#entities/rule';
import { Sources, SyntaxTypes, type Source } from '#shared/lib';

import type { BundleContent } from '../bundle.ts';

export const EXPORTED_AT = '2026-10-24T12:00:00.000Z';

export const makeRule = (id: string, source: Source = Sources.USER, name = 'Block ads'): Rule => ({
    id,
    name,
    enabled: true,
    source,
    type: RuleTypes.BLOCK,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||ads.example.com^' } },
});

export const makeMock = (id: string, source: Source = Sources.USER): Mock => ({
    id,
    name: 'Users',
    enabled: true,
    source,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/users' } },
    response: { status: 200, headers: [], bodyType: MockBodyTypes.JSON, body: '[]', delayMs: 0 },
});

export const makeEnvironment = (id: string, token = 'abc'): Environment => ({
    id,
    name: 'Staging',
    variables: [
        { key: 'baseUrl', value: 'https://staging.example.com', enabled: true, secret: false },
        { key: 'token', value: token, enabled: true, secret: true },
    ],
});

export const makeContent = (overrides: Partial<BundleContent> = {}): BundleContent => ({
    rules: [],
    mocks: [],
    environments: [],
    ...overrides,
});
