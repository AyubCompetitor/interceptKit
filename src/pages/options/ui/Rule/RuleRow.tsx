import type { FC } from 'react';

import type { Rule } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import {
    Badge,
    Button,
    ButtonSizes,
    ButtonVariants,
    Icon,
    IconNames,
    joinClassNames,
    Notice,
    NoticeTones,
    Switch,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import { RULE_BADGE_LABELS } from './ruleLabels.ts';
import styles from './RuleRow.module.css';
import { getRuleSummary } from './ruleSummary.ts';

interface RuleRowProps {
    /** Rule shown in the row */
    rule: Rule;
    /** A host the rule needs but the extension cannot reach yet */
    missingHost: NotRequired<string>;
    /** Called when the rule is switched on or off */
    onToggle: (rule: Rule) => void;
    /** Opens the editor */
    onEdit: (rule: Rule) => void;
    /** Asks to delete the rule */
    onDelete: (rule: Rule) => void;
    /** Asks the browser for access to the host */
    onAccessRequest: (host: string) => void;
}

export const RuleRow: FC<RuleRowProps> = ({ rule, missingHost, onToggle, onEdit, onDelete, onAccessRequest }) => {
    const { t } = useTranslation();

    const summary = getRuleSummary(rule, t);
    const hasSummary = summary !== undefined;
    const hasMissingHost = missingHost !== undefined;

    return (
        <li className={joinClassNames(styles.row, !rule.enabled && styles.isDisabled)}>
            <Switch checked={rule.enabled} label={rule.name} isLabelHidden onChange={() => onToggle(rule)} />

            <div className={styles.details}>
                <div className={styles.title}>
                    <span className={styles.name}>{rule.name}</span>
                    <Badge>{t(RULE_BADGE_LABELS[rule.type])}</Badge>
                </div>

                <code className={styles.pattern}>{rule.match.url.value}</code>

                {hasSummary && (
                    <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                        {summary}
                    </Typography>
                )}

                {hasMissingHost && (
                    <Notice
                        action={
                            <Button size={ButtonSizes.SMALL} onClick={() => onAccessRequest(missingHost)}>
                                {t('ruleAllowAccess')}
                            </Button>
                        }
                        tone={NoticeTones.WARNING}
                    >
                        {t('ruleNoAccess', missingHost)}
                    </Notice>
                )}
            </div>

            <div className={styles.actions}>
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
            </div>
        </li>
    );
};
