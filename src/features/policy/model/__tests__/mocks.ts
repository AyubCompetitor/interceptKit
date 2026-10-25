import { MockBodyTypes, type Mock } from '#entities/mock';
import { RuleTypes, type Rule } from '#entities/rule';
import { Sources, SyntaxTypes, type Source } from '#shared/lib';

export const makeRule = (source: Source = Sources.USER): Rule => ({
    id: 'block-ads',
    name: 'Block ads',
    enabled: true,
    source,
    type: RuleTypes.BLOCK,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||ads.example.com^' } },
});

export const makeMock = (source: Source = Sources.USER): Mock => ({
    id: 'users',
    name: 'Users',
    enabled: true,
    source,
    match: { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/users' } },
    response: { status: 200, headers: [], bodyType: MockBodyTypes.JSON, body: '[]', delayMs: 0 },
});
