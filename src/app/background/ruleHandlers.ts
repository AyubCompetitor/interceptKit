import {
    removeRule,
    rulesItem,
    rulesRpc,
    rulesValidator,
    RuleTargetTypes,
    RuleTypes,
    upsertRule,
    type Rule,
    type RuleIdParams,
} from '#entities/rule';
import { formatIssues, Sources, SyntaxTypes, validate, type TaskQueue } from '#shared/lib';
import { RpcErrorCodes, throwRpcError, type Router } from '#shared/messaging';
import { getRegexRuleLimit, getRegexSupport, readItem, writeItem } from '#shared/platform';

const SAVE_ERRORS = {
    POLICY_SOURCE: 'policy rules come only from the administrator',
    UNSUPPORTED_REGEX: 'the browser cannot run this regex',
    TOO_MANY_REGEX_RULES: 'too many regex rules',
} as const;

const getRegexError = async (rule: Rule, rules: readonly Rule[]): Promise<NotRequired<string>> => {
    const isRgxSyntax = rule.match.url.syntaxType === SyntaxTypes.RGX;

    if (!isRgxSyntax) {
        return;
    }

    const isRgxSubstitution =
        rule.type === RuleTypes.REDIRECT && rule.to.targetType === RuleTargetTypes.RGX_SUBSTITUTION;

    const { reason, isSupported } = await getRegexSupport(rule.match.url.value, isRgxSubstitution);

    if (!isSupported) {
        const errorMessage = `${SAVE_ERRORS.UNSUPPORTED_REGEX}: ${reason ?? 'unknown reason'}`;

        return errorMessage;
    }

    const rgxRules = rules.filter(current => current.match.url.syntaxType === SyntaxTypes.RGX);

    const rgxRulesCount = rgxRules.length;

    const rgxRuleLimit = getRegexRuleLimit();

    if (rgxRulesCount <= rgxRuleLimit) {
        return;
    }

    return SAVE_ERRORS.TOO_MANY_REGEX_RULES;
};

const saveRuleHandler = async (rule: Rule, storageReady: Promise<void>): Promise<Rule> => {
    await storageReady;

    if (rule.source === Sources.POLICY) {
        throwRpcError(RpcErrorCodes.FORBIDDEN, SAVE_ERRORS.POLICY_SOURCE);
    }

    const rules = await readItem(rulesItem);

    const nextRules = upsertRule(rules, rule);

    const listResult = validate(rulesValidator, nextRules);

    if (!listResult.ok) {
        throwRpcError(RpcErrorCodes.BAD_REQUEST, formatIssues(listResult.issues));
    }

    const rgxError = await getRegexError(rule, nextRules);

    if (rgxError) {
        throwRpcError(RpcErrorCodes.BAD_REQUEST, rgxError);
    }

    await writeItem(rulesItem, nextRules);

    return rule;
};

const deleteRuleHandler = async (ruleIdParams: RuleIdParams, storageReady: Promise<void>): Promise<void> => {
    await storageReady;

    const rules = await readItem(rulesItem);

    await writeItem(rulesItem, removeRule(rules, ruleIdParams.id));
};

export const registerRuleHandlers = (router: Router, storageReady: Promise<void>, enqueue: TaskQueue): void => {
    router.on(rulesRpc.save, rule => enqueue(() => saveRuleHandler(rule, storageReady)));
    router.on(rulesRpc.remove, params => enqueue(() => deleteRuleHandler(params, storageReady)));
};
