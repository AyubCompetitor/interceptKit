import { Features, isFeatureEnabled } from '#entities/config';
import { headerRulesRpc, type HeaderRuleIdParams, type HeaderRuleParams } from '#entities/request';
import { isHostAllowed } from '#features/policy';
import type { TaskQueue } from '#shared/lib';
import { RpcError, RpcErrorCodes, type HandlerContext, type Router } from '#shared/messaging';
import { getDynamicRuleLimit, getSessionRules, updateSessionRules } from '#shared/platform';

import { buildHeaderRule, getNextRuleId, getTabRuleIds } from './headerRules.ts';
import { readManagedPolicy } from './managedPolicy.ts';

const HEADER_RULE_ERRORS = {
    NO_TAB: 'only a page in a tab can send requests with such headers',
    API_CLIENT_OFF: 'the policy turns the API client off',
    NOT_ALLOWED: 'the policy does not allow this host',
} as const;

const applyHeaderRuleHandler = async (
    params: HeaderRuleParams,
    { tabId }: HandlerContext,
): Promise<HeaderRuleIdParams> => {
    if (tabId === undefined) {
        throw new RpcError(RpcErrorCodes.BAD_REQUEST, HEADER_RULE_ERRORS.NO_TAB);
    }

    const policy = await readManagedPolicy();

    if (!isFeatureEnabled(policy, Features.API_CLIENT)) {
        throw new RpcError(RpcErrorCodes.FORBIDDEN, HEADER_RULE_ERRORS.API_CLIENT_OFF);
    }

    if (!isHostAllowed(params.host, policy)) {
        throw new RpcError(RpcErrorCodes.FORBIDDEN, HEADER_RULE_ERRORS.NOT_ALLOWED);
    }

    const sessionRules = await getSessionRules();
    const id = getNextRuleId(sessionRules);

    const rule = buildHeaderRule(params, {
        id,
        priority: getDynamicRuleLimit() + 1,
        tabId,
        extensionId: chrome.runtime.id,
    });

    await updateSessionRules(getTabRuleIds(sessionRules, tabId), [rule]);

    return {
        id,
    };
};

const releaseHeaderRuleHandler = async ({ id }: HeaderRuleIdParams): Promise<void> => {
    await updateSessionRules([id], []);
};

export const registerHeaderRuleHandlers = (router: Router, enqueue: TaskQueue): void => {
    router.on(headerRulesRpc.apply, (params, context) => enqueue(() => applyHeaderRuleHandler(params, context)));
    router.on(headerRulesRpc.release, params => enqueue(() => releaseHeaderRuleHandler(params)));
};
