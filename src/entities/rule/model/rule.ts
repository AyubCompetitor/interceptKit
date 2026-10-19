import {
    array,
    boolean,
    discriminatedUnion,
    domainName,
    headerName,
    headerValue,
    HTTP_METHODS,
    httpMethod,
    httpUrl,
    identifier,
    literal,
    object,
    oneOf,
    optional,
    refine,
    string,
    urlPattern,
    type HttpMethod,
    type UrlPattern,
    type Validator,
} from '#shared/lib';

export enum ResourceTypes {
    MAIN_FRAME = 'main_frame',
    SUB_FRAME = 'sub_frame',
    STYLESHEET = 'stylesheet',
    SCRIPT = 'script',
    IMAGE = 'image',
    FONT = 'font',
    OBJECT = 'object',
    XMLHTTPREQUEST = 'xmlhttprequest',
    PING = 'ping',
    CSP_REPORT = 'csp_report',
    MEDIA = 'media',
    WEBSOCKET = 'websocket',
    WEBTRANSPORT = 'webtransport',
    WEBBUNDLE = 'webbundle',
    OTHER = 'other',
}

export type ResourceType = `${ResourceTypes}`;

export const RESOURCE_TYPES = Object.values(ResourceTypes);

export enum HeaderOperations {
    SET = 'set',
    REMOVE = 'remove',
    APPEND = 'append',
}

export type HeaderOperation = `${HeaderOperations}`;

/** Which requests a rule applies to. An absent list means "any"; DNR rejects empty lists */
export interface RequestMatch {
    /** Condition on the request URL */
    readonly url: UrlPattern;
    /** Only requests with these methods */
    readonly methods?: readonly HttpMethod[];
    /** Only requests of these resource types */
    readonly resourceTypes?: readonly ResourceType[];
    /** Only requests started by pages on these domains (subdomains included) */
    readonly initiatorDomains?: readonly string[];
}

export interface HeaderOp {
    /** Header name */
    readonly name: string;
    /** What happens to the header */
    readonly operation: HeaderOperation;
    /** Required for set and append, absent for remove */
    readonly value?: string;
}

export type UrlKind = { readonly kind: 'url'; readonly url: string };

export type RgxSubsKind = { readonly kind: 'regexSubstitution'; readonly value: string };

export type TransformKind = {
    readonly kind: 'transform';
    readonly scheme?: 'http' | 'https';
    readonly host?: string;
    readonly port?: string;
    readonly path?: string;
};

export type RedirectTarget = UrlKind | RgxSubsKind | TransformKind;

/** policy rules come from the administrator and are read-only in the UI */
export type RuleSource = 'user' | 'policy';

interface RuleBase {
    /** Unique within the rule list */
    readonly id: string;
    /** Name shown in the UI */
    readonly name: string;
    /** Disabled rules are kept but not applied */
    readonly enabled: boolean;
    /** Who owns the rule */
    readonly source: RuleSource;
    /** Which requests the rule applies to */
    readonly match: RequestMatch;
}

export interface RedirectRule extends RuleBase {
    /** Rule kind */
    readonly type: 'redirect';
    /** Where matching requests go. */
    readonly to: RedirectTarget;
}

export interface HeaderRule extends RuleBase {
    /** Rule kind */
    readonly type: 'headers';
    /** Changes to request headers */
    readonly request: readonly HeaderOp[];
    /** Changes to response headers */
    readonly response: readonly HeaderOp[];
}

export interface BlockRule extends RuleBase {
    /** Rule kind */
    readonly type: 'block';
}

export type Rule = RedirectRule | HeaderRule | BlockRule;

/** DNR allows at most 5 000 redirect/modifyHeaders ("unsafe") dynamic rules */
export const MAX_RULES = 5000;

const RULE_PATTERNS = {
    PORT: /^\d{1,5}$/,
    PATH: /^\//,
} as const;

const requestMatch: Validator<RequestMatch> = object({
    url: urlPattern,
    methods: optional(array(httpMethod, { minLength: 1, maxLength: HTTP_METHODS.length })),
    resourceTypes: optional(array(oneOf(RESOURCE_TYPES), { minLength: 1, maxLength: RESOURCE_TYPES.length })),
    initiatorDomains: optional(array(domainName, { minLength: 1, maxLength: 1000 })),
});

const headerOp: Validator<HeaderOp> = refine(
    object({ name: headerName, operation: oneOf(Object.values(HeaderOperations)), value: optional(headerValue) }),
    op => {
        if (op.operation === HeaderOperations.REMOVE) {
            return op.value === undefined ? undefined : 'remove must not have a value';
        }

        return op.value === undefined ? `${op.operation} needs a value` : undefined;
    },
);

const redirectTarget: Validator<RedirectTarget> = discriminatedUnion('kind', {
    url: object({ kind: literal('url'), url: httpUrl }),
    regexSubstitution: object({ kind: literal('regexSubstitution'), value: string({ minLength: 1, maxLength: 2048 }) }),
    transform: refine(
        object({
            kind: literal('transform'),
            scheme: optional(oneOf(['http', 'https'])),
            host: optional(domainName),
            port: optional(string({ pattern: RULE_PATTERNS.PORT })),
            path: optional(string({ maxLength: 2048, pattern: RULE_PATTERNS.PATH })),
        }),
        target =>
            [target.scheme, target.host, target.port, target.path].some(part => part !== undefined)
                ? undefined
                : 'transform must change at least one URL part',
    ),
});

const ruleBase = {
    id: identifier,
    name: string({ minLength: 1, maxLength: 200 }),
    enabled: boolean(),
    source: oneOf(['user', 'policy']),
    match: requestMatch,
};

export const ruleValidator: Validator<Rule> = refine(
    discriminatedUnion('type', {
        redirect: object({ ...ruleBase, type: literal('redirect'), to: redirectTarget }),
        headers: refine(
            object({
                ...ruleBase,
                type: literal('headers'),
                request: array(headerOp, { maxLength: 100 }),
                response: array(headerOp, { maxLength: 100 }),
            }),
            rule =>
                rule.request.length + rule.response.length > 0
                    ? undefined
                    : 'a headers rule must change at least one header',
        ),
        block: object({ ...ruleBase, type: literal('block') }),
    }),
    rule =>
        rule.type === 'redirect' && rule.to.kind === 'regexSubstitution' && rule.match.url.kind !== 'regex'
            ? 'regexSubstitution needs a regex URL pattern'
            : undefined,
);

export const rulesValidator: Validator<Rule[]> = refine(array(ruleValidator, { maxLength: MAX_RULES }), rules =>
    new Set(rules.map(rule => rule.id)).size === rules.length ? undefined : 'duplicate rule id',
);
