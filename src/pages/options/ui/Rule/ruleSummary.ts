import {
    RuleTargetTypes,
    RuleTypes,
    type HeaderOp,
    type RedirectTarget,
    type Rule,
    type TransformTarget,
} from '#entities/rule';
import type { MessageKey, TFunction } from '#shared/i18n';

/** A changed part of the URL with the label of its field */
interface TransformChange {
    /** Message key of the part's name */
    readonly label: MessageKey;
    /** New value; none keeps the part */
    readonly value: NotRequired<string>;
}

type ChangedPart = TransformChange & { readonly value: string };

const SEPARATORS = {
    PART: ' · ',
    NAME: ', ',
} as const;

const getTransformChanges = (target: TransformTarget): TransformChange[] => [
    { label: 'ruleScheme', value: target.scheme },
    { label: 'ruleHost', value: target.host },
    { label: 'rulePort', value: target.port },
    { label: 'rulePath', value: target.path },
];

const isChangedPart = (change: TransformChange): change is ChangedPart => change.value !== undefined;

const formatTransform = (target: TransformTarget, t: TFunction): string => {
    const parts = getTransformChanges(target).filter(isChangedPart);

    return parts.map(part => `${t(part.label)}: ${part.value}`).join(SEPARATORS.PART);
};

const formatTarget = (target: RedirectTarget, t: TFunction): string => {
    if (target.targetType === RuleTargetTypes.URL) {
        return t('ruleSummaryRedirect', target.url);
    }

    if (target.targetType === RuleTargetTypes.RGX_SUBSTITUTION) {
        return t('ruleSummaryRedirect', target.value);
    }

    return t('ruleSummaryTransform', formatTransform(target, t));
};

const formatHeaders = (ops: readonly HeaderOp[], t: TFunction): string => {
    const names = new Set(ops.map(op => op.name));

    return t('ruleSummaryHeaders', [...names].join(SEPARATORS.NAME));
};

export const getRuleSummary = (rule: Rule, t: TFunction): NotRequired<string> => {
    if (rule.type === RuleTypes.REDIRECT) {
        return formatTarget(rule.to, t);
    }

    if (rule.type === RuleTypes.HEADERS) {
        return formatHeaders([...rule.request, ...rule.response], t);
    }

    return;
};
