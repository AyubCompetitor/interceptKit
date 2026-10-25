import { useId, type FC } from 'react';

import { buildSectionHash, DashboardSections } from '../../lib/dashboard.ts';
import { useRuleDeletion } from '../../lib/useRuleDeletion.ts';
import { useRuleEditor } from '../../lib/useRuleEditor.ts';
import { getMissingAccess } from '../../model/siteAccess.ts';
import { useRuleList } from '../../model/useRuleList.ts';
import { useSiteAccess } from '../../model/useSiteAccess.ts';

import { useInterceptionSwitch } from '#features/interception-switch';
import { getDisabledRuleFeatures, isPolicyOnly, isRuleAllowed, usePolicy } from '#features/policy';
import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonSizes,
    ButtonVariants,
    EmptyState,
    Flex,
    Icon,
    IconNames,
    Notice,
    NoticeTones,
    Spaces,
    Typography,
    TypographyColors,
} from '#shared/ui';

import { DeleteRuleModal } from './DeleteRuleModal.tsx';
import { formatFeatures } from '../Policy/policySummary.ts';
import { RuleEditor } from './RuleEditor.tsx';
import { RuleRow } from './RuleRow.tsx';
import styles from './RulesSection.module.css';
import { SectionHeader } from '../SectionHeader/SectionHeader.tsx';

const SITES_HASH = buildSectionHash(DashboardSections.SITES);

const POLICY_HASH = buildSectionHash(DashboardSections.POLICY);

export const RulesSection: FC = () => {
    const titleId = useId();

    const { t } = useTranslation();
    const { rules, isActionFailed, onRuleToggle, onRuleDelete } = useRuleList();
    const { patterns, isRequestFailed, onAccessRequest } = useSiteAccess();
    const { policy, isLoading: isPolicyLoading } = usePolicy();
    const { isEnabled, isSaveFailed, onInterceptionEnable } = useInterceptionSwitch();
    const { ruleToDelete, onDeleteRequest, onDeleteCancel, onDeleteConfirm } = useRuleDeletion(onRuleDelete);
    const { editedRule, isEditorOpen, onRuleCreate, onRuleEdit, onEditorClose } = useRuleEditor();

    const newRuleButton = (
        <Button variant={ButtonVariants.PRIMARY} onClick={onRuleCreate}>
            <Icon name={IconNames.PLUS} />
            {t('rulesAdd')}
        </Button>
    );

    if (!rules || !patterns || isPolicyLoading) {
        return null;
    }

    const disabledRuleFeatures = getDisabledRuleFeatures(policy);

    const policyLink = (
        <a className={styles.noticeLink} href={POLICY_HASH}>
            {t('policyOpen')}
        </a>
    );

    return (
        <Flex aria-labelledby={titleId} as='section' direction='column' gap={Spaces.XL}>
            <SectionHeader
                action={!!rules.length && newRuleButton}
                description={t('rulesDescription')}
                title={t('rulesTitle')}
                titleId={titleId}
            />

            {!isEnabled && (
                <Notice
                    action={
                        <Button size={ButtonSizes.SMALL} onClick={onInterceptionEnable}>
                            {t('interceptionTurnOn')}
                        </Button>
                    }
                    tone={NoticeTones.WARNING}
                >
                    {t('interceptionPaused')}
                </Notice>
            )}

            {isPolicyOnly(policy) && (
                <Notice action={policyLink} tone={NoticeTones.WARNING}>
                    {t('rulesPolicyOnly')}
                </Notice>
            )}

            {!!disabledRuleFeatures.length && (
                <Notice action={policyLink} tone={NoticeTones.WARNING}>
                    {t('rulesFeaturesOff', formatFeatures(disabledRuleFeatures, t))}
                </Notice>
            )}

            {!patterns.length && (
                <Notice
                    action={
                        <a className={styles.noticeLink} href={SITES_HASH}>
                            {t('rulesOpenSites')}
                        </a>
                    }
                >
                    {t('rulesNoSites')}
                </Notice>
            )}

            {!!rules.length && (
                <ul className={styles.list}>
                    {rules.map(rule => (
                        <RuleRow
                            key={rule.id}
                            isBlockedByPolicy={!isRuleAllowed(rule, policy)}
                            missingAccess={getMissingAccess(rule, patterns, policy)}
                            rule={rule}
                            onAccessRequest={onAccessRequest}
                            onDelete={onDeleteRequest}
                            onEdit={onRuleEdit}
                            onToggle={onRuleToggle}
                        />
                    ))}
                </ul>
            )}

            {!rules.length && (
                <EmptyState
                    action={newRuleButton}
                    description={t('rulesEmptyText')}
                    icon={IconNames.RULES}
                    title={t('rulesEmptyTitle')}
                />
            )}

            {isActionFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('rulesActionFailed')}
                </Typography>
            )}

            {isRequestFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('sitesRequestFailed')}
                </Typography>
            )}

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('interceptionSaveFailed')}
                </Typography>
            )}

            <RuleEditor isOpen={isEditorOpen} rule={editedRule} onClose={onEditorClose} />

            <DeleteRuleModal rule={ruleToDelete} onCancel={onDeleteCancel} onConfirm={onDeleteConfirm} />
        </Flex>
    );
};
