import type { Rule } from '#entities/rule';

const FILTER_MATCH = { url: { syntaxType: 'filter', value: '||api.example.com/' } } as const;

const REGEX_MATCH = { url: { syntaxType: 'regex', value: '^https://old\\.example\\.com/(.*)$' } } as const;

const RULE_BASE = {
    id: 'rule-1',
    name: 'Rule',
    enabled: true,
    source: 'user',
    match: FILTER_MATCH,
} as const;

export const BLOCK_RULE: Rule = { ...RULE_BASE, type: 'block' };

export const URL_REDIRECT_RULE: Rule = {
    ...RULE_BASE,
    type: 'redirect',
    to: { targetType: 'url', url: 'https://staging.example.com/' },
};

export const SUBSTITUTION_RULE: Rule = {
    ...RULE_BASE,
    type: 'redirect',
    match: REGEX_MATCH,
    to: { targetType: 'regexSubstitution', value: 'https://new.example.com/\\1' },
};

export const TRANSFORM_RULE: Rule = {
    ...RULE_BASE,
    type: 'redirect',
    to: { targetType: 'transform', scheme: 'http', host: 'localhost', port: '8080' },
};

export const HEADER_RULE: Rule = {
    ...RULE_BASE,
    type: 'headers',
    request: [{ name: 'X-Debug', operation: 'set', value: '1' }],
    response: [{ name: 'Server', operation: 'remove' }],
};

export const CONDITIONS_RULE: Rule = {
    ...BLOCK_RULE,
    match: {
        ...FILTER_MATCH,
        methods: ['GET', 'POST'],
        resourceTypes: ['xmlhttprequest'],
        initiatorDomains: ['app.example.com', 'admin.example.com'],
    },
};
