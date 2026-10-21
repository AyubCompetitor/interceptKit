import { formatIssues, Sources, SyntaxTypes, validate } from '#shared/lib';

import { RuleTypes, ruleValidator, type Rule } from '../rule.ts';

export const URL_FILTER_MATCH = { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/' } };

export const REGEX_MATCH = { url: { syntaxType: SyntaxTypes.RGX, value: '^https://old\\.example\\.com/(.*)$' } };

/** Raw rule as it comes from storage or an import; a block rule unless overridden */
export const makeRule = (overrides: Record<string, unknown> = {}) => ({
    id: 'r1',
    name: 'Rule',
    enabled: true,
    source: Sources.USER,
    match: URL_FILTER_MATCH,
    type: RuleTypes.BLOCK,
    ...overrides,
});

export const makeHeaderRule = (request: readonly object[], response: readonly object[] = []) =>
    makeRule({ type: RuleTypes.HEADERS, request, response });

export const makeValidRule = (overrides: Record<string, unknown> = {}): Rule => {
    const result = validate(ruleValidator, makeRule(overrides));

    if (!result.ok) {
        throw new Error(formatIssues(result.issues));
    }

    return result.value;
};
