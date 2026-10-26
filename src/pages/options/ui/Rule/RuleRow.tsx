import type { FC } from 'react';

import type { MissingAccess } from '../../model/siteAccess.ts';

import type { Rule } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { Sources } from '#shared/lib';
import {
    Badge,
    BadgeTones,
    Button,
    ButtonSizes,
    ButtonVariants,
    Icon,
    IconNames,
    joinClassNames,
    Switch,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import { RuleAccessNotice } from './RuleAccessNotice.tsx';
import { RULE_BADGE_LABELS } from './ruleLabels.ts';
import styles from './RuleRow.module.css';
import { getRuleSummary } from './ruleSummary.ts';

interface RuleRowProps {
    /** Rule shown in the row */
    rule: Rule;
    /** The administrator's policy keeps the rule from applying */
    isBlockedByPolicy: boolean;
    /** A host the rule needs but the extension cannot reach yet */
    missingAccess: NotRequired<MissingAccess>;
    /** Called when the rule is switched on or off */
    onToggle: (rule: Rule) => void;
    /** Opens the editor */
    onEdit: (rule: Rule) => void;
    /** Asks to delete the rule */
    onDelete: (rule: Rule) => void;
    /** Asks the browser for access by a host pattern */
    onAccessRequest: (pattern: string) => void;
}

export const RuleRow: FC<RuleRowProps> = ({
    rule,
    isBlockedByPolicy,
    missingAccess,
    onToggle,
    onEdit,
    onDelete,
    onAccessRequest,
}) => {
    const { t } = useTranslation();

    const summary = getRuleSummary(rule, t);
    const hasSummary = summary !== undefined;
    const isPolicyRule = rule.source === Sources.POLICY;

    return (
        <li className={joinClassNames(styles.row, !rule.enabled && styles.isDisabled)}>
            <Switch
                checked={rule.enabled}
                disabled={isPolicyRule}
                label={rule.name}
                isLabelHidden
                onChange={() => onToggle(rule)}
            />

            <div className={styles.details}>
                <div className={styles.title}>
                    <span className={styles.name}>{rule.name}</span>
                    <Badge>{t(RULE_BADGE_LABELS[rule.type])}</Badge>

                    {isPolicyRule && <Badge tone={BadgeTones.ACCENT}>{t('policySourceBadge')}</Badge>}

                    {isBlockedByPolicy && <Badge tone={BadgeTones.WARNING}>{t('policyBlockedBadge')}</Badge>}
                </div>

                <code className={styles.pattern}>{rule.match.url.value}</code>

                {hasSummary && (
                    <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                        {summary}
                    </Typography>
                )}

                {missingAccess && <RuleAccessNotice access={missingAccess} onAccessRequest={onAccessRequest} />}
            </div>

            <div className={styles.actions}>
                {!isPolicyRule && (
                    <>
                        <Button
                            aria-label={t('rulesEdit')}
                            size={ButtonSizes.SMALL}
                            title={t('rulesEdit')}
                            variant={ButtonVariants.GHOST}
                            isIconOnly
                            onClick={() => onEdit(rule)}
                        >
                            <Icon name={IconNames.EDIT} />
                        </Button>
                        <Button
                            aria-label={t('rulesDelete')}
                            size={ButtonSizes.SMALL}
                            title={t('rulesDelete')}
                            variant={ButtonVariants.GHOST}
                            isIconOnly
                            onClick={() => onDelete(rule)}
                        >
                            <Icon name={IconNames.DELETE} />
                        </Button>
                    </>
                )}
            </div>
        </li>
    );
};
