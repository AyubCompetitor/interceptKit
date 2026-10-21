import {
    array,
    boolean,
    discriminatedUnion,
    displayName,
    domainName,
    isDuplicateValues,
    headerName,
    headerValue,
    httpMethods,
    httpUrl,
    identifier,
    literal,
    object,
    oneOf,
    optional,
    refine,
    source,
    string,
    SyntaxTypes,
    urlPattern,
    type HttpMethod,
    type Source,
    type UrlPattern,
    type Validator,
} from '#shared/lib';

export enum RuleTargetTypes {
    URL = 'url',
    RGX_SUBSTITUTION = 'regexSubstitution',
    TRANSFORM = 'transform',
}

export type RuleTargetType = `${RuleTargetTypes}`;

export enum RuleTypes {
    REDIRECT = 'redirect',
    HEADERS = 'headers',
    BLOCK = 'block',
}

export type RuleType = `${RuleTypes}`;

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

export const HEADER_OPERATIONS = Object.values(HeaderOperations);

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

export type UrlTarget = { readonly targetType: RuleTargetTypes.URL; readonly url: string };

export type RgxSubstitutionTarget = { readonly targetType: RuleTargetTypes.RGX_SUBSTITUTION; readonly value: string };

export type TransformTarget = {
    readonly targetType: RuleTargetTypes.TRANSFORM;
    readonly scheme?: 'http' | 'https';
    readonly host?: string;
    readonly port?: string;
    readonly path?: string;
};

export type RedirectTarget = UrlTarget | RgxSubstitutionTarget | TransformTarget;

interface RuleBase {
    /** Unique within the rule list */
    readonly id: string;
    /** Name shown in the UI */
    readonly name: string;
    /** Disabled rules are kept but not applied */
    readonly enabled: boolean;
    /** Who owns the rule */
    readonly source: Source;
    /** Which requests the rule applies to */
    readonly match: RequestMatch;
}

export interface RedirectRule extends RuleBase {
    /** Rule type */
    readonly type: RuleTypes.REDIRECT;
    /** Where matching requests go */
    readonly to: RedirectTarget;
}

export interface HeaderRule extends RuleBase {
    /** Rule type */
    readonly type: RuleTypes.HEADERS;
    /** Changes to request headers */
    readonly request: readonly HeaderOp[];
    /** Changes to response headers */
    readonly response: readonly HeaderOp[];
}

export interface BlockRule extends RuleBase {
    /** Rule type */
    readonly type: RuleTypes.BLOCK;
}

export type Rule = RedirectRule | HeaderRule | BlockRule;

/** DNR allows at most 5 000 redirect/modifyHeaders ("unsafe") dynamic rules */
export const MAX_RULES = 5000;

const RULE_RGXS = {
    PORT: /^\d{1,5}$/,
    PATH: /^\//,
} as const;

/** The only request headers DNR lets an extension append to */
const APPENDABLE_REQUEST_HEADERS = new Set([
    'accept',
    'accept-encoding',
    'accept-language',
    'access-control-request-headers',
    'cache-control',
    'connection',
    'content-language',
    'cookie',
    'forwarded',
    'if-match',
    'if-none-match',
    'keep-alive',
    'range',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'user-agent',
    'via',
    'want-digest',
    'x-forwarded-for',
]);

const RULE_ERRORS = {
    REMOVE_WITH_VALUE: 'remove must not have a value',
    NEEDS_VALUE: 'needs a value',
    EMPTY_TRANSFORM: 'transform must change at least one URL part',
    NO_HEADER_CHANGES: 'a headers rule must change at least one header',
    APPEND_NOT_ALLOWED: 'cannot append to request header',
    SUBSTITUTION_WITHOUT_REGEX: 'regexSubstitution needs a regex URL pattern',
    DUPLICATE_ID: 'duplicate rule id',
} as const;

const isForbiddenAppend = (op: HeaderOp): boolean => {
    const isAppend = op.operation === HeaderOperations.APPEND;

    return isAppend && !APPENDABLE_REQUEST_HEADERS.has(op.name.toLowerCase());
};

const getHeaderOpError = (op: HeaderOp): NotRequired<string> => {
    const hasValue = op.value !== undefined;

    const isRemove = op.operation === HeaderOperations.REMOVE;

    if (isRemove && hasValue) {
        return RULE_ERRORS.REMOVE_WITH_VALUE;
    }

    if (!isRemove && !hasValue) {
        return `${op.operation} ${RULE_ERRORS.NEEDS_VALUE}`;
    }

    return;
};

const getTransformError = (target: TransformTarget): NotRequired<string> => {
    const parts = [target.scheme, target.host, target.port, target.path];

    const hasChanges = parts.some(part => part !== undefined);

    if (hasChanges) {
        return;
    }

    return RULE_ERRORS.EMPTY_TRANSFORM;
};

const getHeaderRuleError = (rule: HeaderRule): NotRequired<string> => {
    const hasChanges = rule.request.length + rule.response.length > 0;

    if (!hasChanges) {
        return RULE_ERRORS.NO_HEADER_CHANGES;
    }

    const forbiddenAppend = rule.request.find(isForbiddenAppend);

    if (forbiddenAppend) {
        return `${RULE_ERRORS.APPEND_NOT_ALLOWED} ${forbiddenAppend.name}`;
    }

    return;
};

const getSubstitutionError = (rule: Rule): NotRequired<string> => {
    const isRgxPattern = rule.match.url.syntaxType === SyntaxTypes.RGX;
    const isRgxSubstitution =
        rule.type === RuleTypes.REDIRECT && rule.to.targetType === RuleTargetTypes.RGX_SUBSTITUTION;

    if (!isRgxSubstitution || isRgxPattern) {
        return;
    }

    return RULE_ERRORS.SUBSTITUTION_WITHOUT_REGEX;
};

const getDuplicateIdError = (rules: readonly Rule[]): NotRequired<string> => {
    const ids = rules.map(rule => rule.id);

    if (isDuplicateValues(ids)) {
        return RULE_ERRORS.DUPLICATE_ID;
    }

    return;
};

const requestMatch: Validator<RequestMatch> = object({
    url: urlPattern,
    methods: optional(httpMethods),
    resourceTypes: optional(array(oneOf(RESOURCE_TYPES), { minLength: 1, maxLength: RESOURCE_TYPES.length })),
    initiatorDomains: optional(array(domainName, { minLength: 1, maxLength: 1000 })),
});

const headerOp = refine(
    object({ name: headerName, operation: oneOf(HEADER_OPERATIONS), value: optional(headerValue) }),
    getHeaderOpError,
);

const transformTarget = refine(
    object({
        targetType: literal(RuleTargetTypes.TRANSFORM),
        scheme: optional(oneOf(['http', 'https'])),
        host: optional(domainName),
        port: optional(string({ pattern: RULE_RGXS.PORT })),
        path: optional(string({ maxLength: 2048, pattern: RULE_RGXS.PATH })),
    }),
    getTransformError,
);

const redirectTarget: Validator<RedirectTarget> = discriminatedUnion('targetType', {
    url: object({ targetType: literal(RuleTargetTypes.URL), url: httpUrl }),
    regexSubstitution: object({
        targetType: literal(RuleTargetTypes.RGX_SUBSTITUTION),
        value: string({ minLength: 1, maxLength: 2048 }),
    }),
    transform: transformTarget,
});

const ruleBase = {
    id: identifier,
    name: displayName,
    enabled: boolean(),
    source,
    match: requestMatch,
};

const redirectRule = object({ ...ruleBase, type: literal(RuleTypes.REDIRECT), to: redirectTarget });

const headerRule = refine(
    object({
        ...ruleBase,
        type: literal(RuleTypes.HEADERS),
        request: array(headerOp, { maxLength: 100 }),
        response: array(headerOp, { maxLength: 100 }),
    }),
    getHeaderRuleError,
);

const blockRule = object({ ...ruleBase, type: literal(RuleTypes.BLOCK) });

export const ruleValidator: Validator<Rule> = refine(
    discriminatedUnion('type', {
        redirect: redirectRule,
        headers: headerRule,
        block: blockRule,
    }),

    getSubstitutionError,
);

export const rulesValidator: Validator<Rule[]> = refine(
    array(ruleValidator, { maxLength: MAX_RULES }),
    getDuplicateIdError,
);
