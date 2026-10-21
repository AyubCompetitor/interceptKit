import {
    HeaderOperations,
    RuleTargetTypes,
    RuleTypes,
    type HeaderOp,
    type HeaderOperation,
    type RedirectTarget,
    type RequestMatch,
    type ResourceType,
    type Rule,
    type RuleTargetType,
    type RuleType,
    type TransformTarget,
} from '#entities/rule';
import { getRandomUUID, Sources, SyntaxTypes, type HttpMethod, type UrlPattern } from '#shared/lib';

export type SyntaxType = UrlPattern['syntaxType'];

/** A new scheme for the URL, or an empty string to keep the original one */
export type SchemeChoice = NonNullable<TransformTarget['scheme']> | '';

/** A header change as the form edits it */
export interface HeaderOpDraft {
    /** React key of the row, never saved */
    readonly key: string;
    /** Header name */
    readonly name: string;
    /** What happens to the header */
    readonly operation: HeaderOperation;
    /** Ignored when the header is removed */
    readonly value: string;
}

/** Every field of the rule form; fields of the other rule types survive switching the type */
export interface RuleDraft {
    /** Id of the edited rule or of the new one */
    readonly id: string;
    /** Name shown in the list */
    readonly name: string;
    /** Whether the rule applies */
    readonly enabled: boolean;
    /** What the rule does */
    readonly type: RuleType;

    /** Syntax of the URL pattern */
    readonly syntaxType: SyntaxType;
    /** URL pattern of the requests */
    readonly pattern: string;
    /** Chosen methods; none means any */
    readonly methods: readonly HttpMethod[];
    /** Chosen resource types; none means all */
    readonly resourceTypes: readonly ResourceType[];
    /** Domains of the initiating pages as typed, separated by commas or spaces */
    readonly initiatorDomains: string;

    /** Which redirect target the rule uses */
    readonly targetType: RuleTargetType;
    /** Target of a redirect to a URL */
    readonly url: string;
    /** Target of a redirect by regex substitution */
    readonly regexSubstitution: string;
    /** New scheme; empty keeps the original */
    readonly scheme: SchemeChoice;
    /** New host; empty keeps the original */
    readonly host: string;
    /** New port; empty keeps the original */
    readonly port: string;
    /** New path; empty keeps the original */
    readonly path: string;

    /** Changes to request headers */
    readonly requestHeaders: readonly HeaderOpDraft[];
    /** Changes to response headers */
    readonly responseHeaders: readonly HeaderOpDraft[];
}

/** Props of a group of fields in the rule form */
export interface DraftFields {
    /** Current form state */
    draft: RuleDraft;
    /** Merges changed fields into the form state */
    onDraftChange: RuleDraftChange;
}

export type RuleDraftPatch = Partial<RuleDraft>;

/** Merges changed fields into the form state */
export type RuleDraftChange = (patch: RuleDraftPatch) => void;

/** Changes the header row with the key */
export type HeaderOpChange = (key: string, patch: Partial<HeaderOpDraft>) => void;

/** Commas or whitespace between domains */
const DOMAIN_SEPARATOR_RGX = /[\s,]+/;

const NEW_RULE_DRAFT: Omit<RuleDraft, 'id'> = {
    name: '',
    enabled: true,
    type: RuleTypes.REDIRECT,
    syntaxType: SyntaxTypes.FILTER,
    pattern: '',
    methods: [],
    resourceTypes: [],
    initiatorDomains: '',
    targetType: RuleTargetTypes.URL,
    url: '',
    regexSubstitution: '',
    scheme: '',
    host: '',
    port: '',
    path: '',
    requestHeaders: [],
    responseHeaders: [],
};

export const createHeaderOpDraft = (): HeaderOpDraft => ({
    key: getRandomUUID(),
    name: '',
    operation: HeaderOperations.SET,
    value: '',
});

const mapHeaderOpToDraft = (op: HeaderOp): HeaderOpDraft => ({
    key: getRandomUUID(),
    name: op.name,
    operation: op.operation,
    value: op.value ?? '',
});

const getTargetFields = (target: RedirectTarget): RuleDraftPatch => {
    if (target.targetType === RuleTargetTypes.URL) {
        return {
            targetType: RuleTargetTypes.URL,
            url: target.url,
        };
    }

    if (target.targetType === RuleTargetTypes.RGX_SUBSTITUTION) {
        return {
            targetType: RuleTargetTypes.RGX_SUBSTITUTION,
            regexSubstitution: target.value,
        };
    }

    return {
        targetType: RuleTargetTypes.TRANSFORM,
        scheme: target.scheme ?? '',
        host: target.host ?? '',
        port: target.port ?? '',
        path: target.path ?? '',
    };
};

const getActionFields = (rule: Rule): RuleDraftPatch => {
    if (rule.type === RuleTypes.REDIRECT) {
        return getTargetFields(rule.to);
    }

    if (rule.type === RuleTypes.HEADERS) {
        return {
            requestHeaders: rule.request.map(mapHeaderOpToDraft),
            responseHeaders: rule.response.map(mapHeaderOpToDraft),
        };
    }

    return {};
};

/** Form state of a rule; an empty redirect rule when there is none */
export const createRuleDraft = (rule: NotRequired<Rule>): RuleDraft => {
    if (rule === undefined) {
        return { ...NEW_RULE_DRAFT, id: getRandomUUID() };
    }

    const { match } = rule;

    return {
        ...NEW_RULE_DRAFT,
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        type: rule.type,
        syntaxType: match.url.syntaxType,
        pattern: match.url.value,
        methods: match.methods ?? [],
        resourceTypes: match.resourceTypes ?? [],
        initiatorDomains: (match.initiatorDomains ?? []).join(', '),
        ...getActionFields(rule),
    };
};

const parseDomainList = (text: string): string[] => {
    const domains = text.toLowerCase().split(DOMAIN_SEPARATOR_RGX);

    return domains.filter(domain => domain !== '');
};

/** How many optional conditions narrow the rule: methods, resource types and initiator domains */
export const countDraftConditions = (draft: RuleDraft): number => {
    const hasMethods = draft.methods.length > 0;
    const hasResourceTypes = draft.resourceTypes.length > 0;
    const hasInitiatorDomains = parseDomainList(draft.initiatorDomains).length > 0;

    return [hasMethods, hasResourceTypes, hasInitiatorDomains].filter(Boolean).length;
};

/** DNR rejects empty condition lists, so an empty choice is left out and means "any" */
const buildMatch = (draft: RuleDraft): RequestMatch => {
    const initiatorDomains = parseDomainList(draft.initiatorDomains);

    const hasMethods = draft.methods.length > 0;
    const hasResourceTypes = draft.resourceTypes.length > 0;
    const hasInitiatorDomains = initiatorDomains.length > 0;

    return {
        url: { syntaxType: draft.syntaxType, value: draft.pattern.trim() },
        ...(hasMethods && { methods: draft.methods }),
        ...(hasResourceTypes && { resourceTypes: draft.resourceTypes }),
        ...(hasInitiatorDomains && { initiatorDomains }),
    };
};

const buildHeaderOp = (draft: HeaderOpDraft): HeaderOp => {
    const name = draft.name.trim();

    if (draft.operation === HeaderOperations.REMOVE) {
        return {
            name,
            operation: draft.operation,
        };
    }

    return {
        name,
        operation: draft.operation,
        value: draft.value,
    };
};

/** Empty fields keep that part of the original URL */
const buildTransformTarget = (draft: RuleDraft): TransformTarget => {
    const { scheme } = draft;
    const host = draft.host.trim();
    const port = draft.port.trim();
    const path = draft.path.trim();

    return {
        targetType: RuleTargetTypes.TRANSFORM,
        ...(scheme !== '' && { scheme }),
        ...(host !== '' && { host }),
        ...(port !== '' && { port }),
        ...(path !== '' && { path }),
    };
};

const buildTarget = (draft: RuleDraft): RedirectTarget => {
    if (draft.targetType === RuleTargetTypes.URL) {
        return { targetType: RuleTargetTypes.URL, url: draft.url.trim() };
    }

    if (draft.targetType === RuleTargetTypes.RGX_SUBSTITUTION) {
        return { targetType: RuleTargetTypes.RGX_SUBSTITUTION, value: draft.regexSubstitution.trim() };
    }

    return buildTransformTarget(draft);
};

/** The rule the form describes; the background validates it before saving */
export const buildRule = (draft: RuleDraft): Rule => {
    const base = {
        id: draft.id,
        name: draft.name.trim(),
        enabled: draft.enabled,
        source: Sources.USER,
        match: buildMatch(draft),
    };

    if (draft.type === RuleTypes.BLOCK) {
        return {
            ...base,
            type: RuleTypes.BLOCK,
        };
    }

    if (draft.type === RuleTypes.HEADERS) {
        return {
            ...base,
            type: RuleTypes.HEADERS,
            request: draft.requestHeaders.map(buildHeaderOp),
            response: draft.responseHeaders.map(buildHeaderOp),
        };
    }

    return {
        ...base,
        type: RuleTypes.REDIRECT,
        to: buildTarget(draft),
    };
};

export const updateHeaderOp = (
    ops: readonly HeaderOpDraft[],
    key: string,
    patch: Partial<HeaderOpDraft>,
): HeaderOpDraft[] => {
    return ops.map(op => {
        if (op.key !== key) {
            return op;
        }

        return { ...op, ...patch };
    });
};
