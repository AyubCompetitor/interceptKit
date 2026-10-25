import { Features, type Feature, type ManagedPolicy } from '#entities/config';
import type { PresetRead } from '#features/transfer';
import type { MessageKey, TFunction } from '#shared/i18n';

/** The policy as the section reads it */
interface PolicyView {
    /** Fields of the policy after the fail-closed reading */
    readonly policy: ManagedPolicy;
    /** Its bundle of rules and mocks, read */
    readonly preset: PresetRead;
}

/** One line of what the policy sets */
interface PolicyRow {
    /** Message key of the field's name */
    readonly label: MessageKey;
    /** What the field sets, as text */
    readonly value: string;
}

/** A field of the policy the section shows */
interface PolicyField {
    /** Message key of the field's name */
    readonly label: MessageKey;
    /** What the field sets, as text; none when the policy leaves it out */
    readonly format: (view: PolicyView, t: TFunction) => NotRequired<string>;
}

const FEATURE_LABELS: Readonly<Record<Feature, MessageKey>> = {
    [Features.REDIRECT]: 'policyFeatureRedirect',
    [Features.HEADERS]: 'policyFeatureHeaders',
    [Features.BLOCK]: 'policyFeatureBlock',
    [Features.MOCKS]: 'policyFeatureMocks',
    [Features.API_CLIENT]: 'policyFeatureApiClient',
};

const LIST_SEPARATOR = ', ';

export const formatFeatures = (features: readonly Feature[], t: TFunction): string =>
    features.map(feature => t(FEATURE_LABELS[feature])).join(LIST_SEPARATOR);

const formatDisabledFeatures = ({ policy }: PolicyView, t: TFunction): NotRequired<string> => {
    if (!policy.disabledFeatures) {
        return;
    }

    return formatFeatures(policy.disabledFeatures, t) || t('policyNoFeaturesOff');
};

const formatAllowedHosts = ({ policy }: PolicyView, t: TFunction): NotRequired<string> => {
    if (!policy.allowedHosts) {
        return;
    }

    return policy.allowedHosts.join(LIST_SEPARATOR) || t('policyNoHosts');
};

const formatAllowUserRules = ({ policy }: PolicyView, t: TFunction): NotRequired<string> => {
    if (policy.allowUserRules === undefined) {
        return;
    }

    return t(policy.allowUserRules ? 'policyUserRulesAllowed' : 'policyUserRulesForbidden');
};

const formatRequireVault = ({ policy }: PolicyView, t: TFunction): NotRequired<string> => {
    if (policy.requireVault === undefined) {
        return;
    }

    return t(policy.requireVault ? 'policyVaultRequired' : 'policyVaultOptional');
};

const formatPresetBundle = ({ policy, preset }: PolicyView, t: TFunction): NotRequired<string> => {
    if (policy.presetBundle === undefined) {
        return;
    }

    if (!preset.content) {
        return t('policyPresetBroken');
    }

    return t('policyPresetCounts', String(preset.content.rules.length), String(preset.content.mocks.length));
};

const POLICY_FIELDS: readonly PolicyField[] = [
    { label: 'policyDisabledFeatures', format: formatDisabledFeatures },
    { label: 'policyAllowedHosts', format: formatAllowedHosts },
    { label: 'policyAllowUserRules', format: formatAllowUserRules },
    { label: 'policyRequireVault', format: formatRequireVault },
    { label: 'policyPresetBundle', format: formatPresetBundle },
];

export const getPolicyRows = (view: PolicyView, t: TFunction): PolicyRow[] =>
    POLICY_FIELDS.map(field => ({
        label: field.label,
        value: field.format(view, t) ?? t('policyNotSet'),
    }));
