import { formatIssues, validate } from '#shared/lib';

import { ruleValidator, type Rule } from '../rule.ts';

export const URL_FILTER_MATCH = { url: { syntaxType: 'filter', value: '||api.example.com/' } };

export const REGEX_MATCH = { url: { syntaxType: 'regex', value: '^https://old\\.example\\.com/(.*)$' } };

/** Raw rule as it comes from storage or an import; a block rule unless overridden */
export const makeRule = (overrides: Record<string, unknown> = {}) => ({
    id: 'r1',
    name: 'Rule',
    enabled: true,
    source: 'user',
    match: URL_FILTER_MATCH,
    type: 'block',
    ...overrides,
});

export const makeHeaderRule = (request: readonly object[], response: readonly object[] = []) =>
    makeRule({ type: 'headers', request, response });

export const makeValidRule = (overrides: Record<string, unknown> = {}): Rule => {
    const result = validate(ruleValidator, makeRule(overrides));

    if (!result.ok) {
        throw new Error(formatIssues(result.issues));
    }

    return result.value;
};
