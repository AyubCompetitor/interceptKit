import type { SchemeChoice, SyntaxType } from '../../model/ruleDraft.ts';

import {
    HeaderOperations,
    ResourceTypes,
    RuleTargetTypes,
    RuleTypes,
    type HeaderOperation,
    type ResourceType,
    type RuleTargetType,
    type RuleType,
} from '#entities/rule';
import type { MessageKey } from '#shared/i18n';
import { SyntaxTypes } from '#shared/lib';

export const RULE_TYPE_LABELS: Record<RuleType, MessageKey> = {
    [RuleTypes.REDIRECT]: 'ruleTypeRedirect',
    [RuleTypes.HEADERS]: 'ruleTypeHeaders',
    [RuleTypes.BLOCK]: 'ruleTypeBlock',
};

export const RULE_TYPE_HINTS: Record<RuleType, MessageKey> = {
    [RuleTypes.REDIRECT]: 'ruleTypeRedirectHint',
    [RuleTypes.HEADERS]: 'ruleTypeHeadersHint',
    [RuleTypes.BLOCK]: 'ruleTypeBlockHint',
};

export const RULE_BADGE_LABELS: Record<RuleType, MessageKey> = {
    [RuleTypes.REDIRECT]: 'ruleBadgeRedirect',
    [RuleTypes.HEADERS]: 'ruleBadgeHeaders',
    [RuleTypes.BLOCK]: 'ruleBadgeBlock',
};

export const SYNTAX_TYPE_LABELS: Record<SyntaxType, MessageKey> = {
    [SyntaxTypes.FILTER]: 'ruleSyntaxFilter',
    [SyntaxTypes.RGX]: 'ruleSyntaxRegex',
};

export const PATTERN_HINTS: Record<SyntaxType, MessageKey> = {
    [SyntaxTypes.FILTER]: 'rulePatternFilterHint',
    [SyntaxTypes.RGX]: 'rulePatternRegexHint',
};

export const PATTERN_PLACEHOLDERS: Record<SyntaxType, MessageKey> = {
    [SyntaxTypes.FILTER]: 'rulePatternFilterPlaceholder',
    [SyntaxTypes.RGX]: 'rulePatternRegexPlaceholder',
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, MessageKey> = {
    [ResourceTypes.MAIN_FRAME]: 'resourceTypeMainFrame',
    [ResourceTypes.SUB_FRAME]: 'resourceTypeSubFrame',
    [ResourceTypes.XMLHTTPREQUEST]: 'resourceTypeXhr',
    [ResourceTypes.SCRIPT]: 'resourceTypeScript',
    [ResourceTypes.STYLESHEET]: 'resourceTypeStylesheet',
    [ResourceTypes.IMAGE]: 'resourceTypeImage',
    [ResourceTypes.FONT]: 'resourceTypeFont',
    [ResourceTypes.MEDIA]: 'resourceTypeMedia',
    [ResourceTypes.WEBSOCKET]: 'resourceTypeWebsocket',
    [ResourceTypes.WEBTRANSPORT]: 'resourceTypeWebtransport',
    [ResourceTypes.WEBBUNDLE]: 'resourceTypeWebbundle',
    [ResourceTypes.OBJECT]: 'resourceTypeObject',
    [ResourceTypes.PING]: 'resourceTypePing',
    [ResourceTypes.CSP_REPORT]: 'resourceTypeCspReport',
    [ResourceTypes.OTHER]: 'resourceTypeOther',
};

export const TARGET_TYPE_LABELS: Record<RuleTargetType, MessageKey> = {
    [RuleTargetTypes.URL]: 'ruleTargetUrl',
    [RuleTargetTypes.RGX_SUBSTITUTION]: 'ruleTargetSubstitution',
    [RuleTargetTypes.TRANSFORM]: 'ruleTargetTransform',
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
