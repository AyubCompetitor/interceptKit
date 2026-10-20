import type { RuleType, SchemeChoice, SyntaxType, TargetType } from '../model/ruleDraft.ts';

import { HeaderOperations, type HeaderOperation } from '#entities/rule';
import type { MessageKey } from '#shared/i18n';
import { SyntaxTypes } from '#shared/lib';

/** Labels of the form's choices; the key order is the order of the options */
export const RULE_TYPE_LABELS: Record<RuleType, MessageKey> = {
    redirect: 'ruleTypeRedirect',
    headers: 'ruleTypeHeaders',
    block: 'ruleTypeBlock',
};

export const SYNTAX_TYPE_LABELS: Record<SyntaxType, MessageKey> = {
    [SyntaxTypes.FILTER]: 'ruleSyntaxFilter',
    [SyntaxTypes.RGX]: 'ruleSyntaxRegex',
};

export const TARGET_TYPE_LABELS: Record<TargetType, MessageKey> = {
    url: 'ruleTargetUrl',
    regexSubstitution: 'ruleTargetSubstitution',
    transform: 'ruleTargetTransform',
};

export const SCHEME_LABELS: Record<SchemeChoice, MessageKey> = {
    '': 'ruleSchemeKeep',
    http: 'ruleSchemeHttp',
    https: 'ruleSchemeHttps',
};

export const HEADER_OPERATION_LABELS: Record<HeaderOperation, MessageKey> = {
    [HeaderOperations.SET]: 'ruleHeaderSet',
    [HeaderOperations.REMOVE]: 'ruleHeaderRemove',
    [HeaderOperations.APPEND]: 'ruleHeaderAppend',
};
