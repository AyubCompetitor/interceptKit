import { SyntaxTypes, type HttpMethod } from '#shared/lib';

import type {
    DnrAction,
    DnrCondition,
    DnrHeaderInfo,
    DnrModifyHeadersAction,
    DnrRedirect,
    DnrRequestMethod,
    DnrRule,
} from './dnr.ts';
import {
    RESOURCE_TYPES,
    type HeaderOp,
    type HeaderRule,
    type RedirectTarget,
    type RequestMatch,
    type Rule,
} from './rule.ts';

const DNR_METHODS: Record<HttpMethod, DnrRequestMethod> = {
    GET: 'get',
    HEAD: 'head',
    POST: 'post',
    PUT: 'put',
    PATCH: 'patch',
    DELETE: 'delete',
    OPTIONS: 'options',
    CONNECT: 'connect',
};

/** No resource types in a rule means all of them: on its own DNR would skip main_frame */
const mapMatchToCondition = (match: RequestMatch): DnrCondition => {
    const condition: DnrCondition = {
        resourceTypes: [...(match.resourceTypes ?? RESOURCE_TYPES)],
    };

    if (match.url.syntaxType === SyntaxTypes.RGX) {
        condition.regexFilter = match.url.value;
    } else {
        condition.urlFilter = match.url.value;
    }

    if (match.methods) {
        condition.requestMethods = match.methods.map(method => DNR_METHODS[method]);
    }

    if (match.initiatorDomains) {
        condition.initiatorDomains = [...match.initiatorDomains];
    }

    return condition;
};

/** Header names are case-insensitive, while the DNR append allowlist is lowercase */
const mapHeaderOpToInfo = (op: HeaderOp): DnrHeaderInfo => {
    const info: DnrHeaderInfo = {
        header: op.name.toLowerCase(),
        operation: op.operation,
    };

    if (op.value !== undefined) {
        info.value = op.value;
    }

    return info;
};

const mapTargetToRedirect = (target: RedirectTarget): DnrRedirect => {
    if (target.targetType === 'url') {
        return { url: target.url };
    }

    if (target.targetType === 'regexSubstitution') {
        return { regexSubstitution: target.value };
    }

    const { targetType: _targetType, ...transform } = target;

    return { transform };
};

const mapRuleToHeadersAction = (rule: HeaderRule): DnrModifyHeadersAction => {
    const action: DnrModifyHeadersAction = { type: 'modifyHeaders' };

    if (rule.request.length > 0) {
        action.requestHeaders = rule.request.map(mapHeaderOpToInfo);
    }

    if (rule.response.length > 0) {
        action.responseHeaders = rule.response.map(mapHeaderOpToInfo);
    }

    return action;
};

const mapRuleToAction = (rule: Rule): DnrAction => {
    if (rule.type === 'block') {
        return { type: 'block' };
    }

    if (rule.type === 'redirect') {
        return {
            type: 'redirect',
            redirect: mapTargetToRedirect(rule.to),
        };
    }

    return mapRuleToHeadersAction(rule);
};

/** Turns active rules into DNR rules; the first rule in the list wins, so priority follows the order */
export const compileRules = (rules: readonly Rule[]): DnrRule[] => {
    return rules.map((rule, index) => ({
        id: index + 1,
        priority: rules.length - index,
        action: mapRuleToAction(rule),
        condition: mapMatchToCondition(rule.match),
    }));
};
