import { MockBodyTypes, type Mock } from '#entities/mock';
import { HeaderOperations, ResourceTypes, RuleTargetTypes, RuleTypes, type Rule } from '#entities/rule';
import { HttpMethods, Sources, SyntaxTypes } from '#shared/lib';

const FILTER_MATCH = { url: { syntaxType: SyntaxTypes.FILTER, value: '||api.example.com/' } } as const;

const REGEX_MATCH = { url: { syntaxType: SyntaxTypes.RGX, value: '^https://old\\.example\\.com/(.*)$' } } as const;

const RULE_BASE = {
    id: 'rule-1',
    name: 'Rule',
    enabled: true,
    source: Sources.USER,
    match: FILTER_MATCH,
} as const;

export const BLOCK_RULE: Rule = { ...RULE_BASE, type: RuleTypes.BLOCK };

export const URL_REDIRECT_RULE: Rule = {
    ...RULE_BASE,
    type: RuleTypes.REDIRECT,
    to: {
        targetType: RuleTargetTypes.URL,
        url: 'https://staging.example.com/',
    },
};

export const SUBSTITUTION_RULE: Rule = {
    ...RULE_BASE,
    type: RuleTypes.REDIRECT,
    match: REGEX_MATCH,
    to: {
        targetType: RuleTargetTypes.RGX_SUBSTITUTION,
        value: 'https://new.example.com/\\1',
    },
};

export const TRANSFORM_RULE: Rule = {
    ...RULE_BASE,
    type: RuleTypes.REDIRECT,
    to: {
        targetType: RuleTargetTypes.TRANSFORM,
        scheme: 'http',
        host: 'localhost',
        port: '8080',
    },
};

export const HEADER_RULE: Rule = {
    ...RULE_BASE,
    type: RuleTypes.HEADERS,
    request: [
        {
            name: 'X-Debug',
            operation: HeaderOperations.SET,
            value: '1',
        },
    ],
    response: [
        {
            name: 'Server',
            operation: HeaderOperations.REMOVE,
        },
    ],
};

export const CONDITIONS_RULE: Rule = {
    ...BLOCK_RULE,
    match: {
        ...FILTER_MATCH,
        methods: [HttpMethods.GET, HttpMethods.POST],
        resourceTypes: [ResourceTypes.XMLHTTPREQUEST],
        initiatorDomains: ['app.example.com', 'admin.example.com'],
    },
};

export const JSON_MOCK: Mock = {
    id: 'mock-1',
    name: 'Users',
    enabled: true,
    source: Sources.USER,
    match: FILTER_MATCH,
    response: {
        status: 200,
        headers: [],
        bodyType: MockBodyTypes.JSON,
        body: '{"users":[]}',
        delayMs: 0,
    },
};

export const DETAILED_MOCK: Mock = {
    ...JSON_MOCK,
    enabled: false,
    match: { ...FILTER_MATCH, methods: [HttpMethods.POST] },
    response: {
        status: 503,
        headers: [
            { key: 'Retry-After', value: '30', enabled: true },
            { key: 'X-Draft', value: '1', enabled: false },
        ],
        bodyType: MockBodyTypes.TEXT,
        body: 'Down for maintenance',
        delayMs: 1500,
    },
};
