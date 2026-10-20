import type { FC } from 'react';

import type { Rule } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonSizes,
    ButtonVariants,
    Checkbox,
    Flex,
    Spaces,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import { RULE_TYPE_LABELS } from './ruleLabels.ts';
import styles from './RuleRow.module.css';

interface RuleRowProps {
    /** Rule shown in the row */
    rule: Rule;
    /** Called when the rule is switched on or off */
    onToggle: (rule: Rule) => void;
    /** Opens the editor */
    onEdit: (rule: Rule) => void;
    /** Asks to delete the rule */
    onDelete: (rule: Rule) => void;
}

export const RuleRow: FC<RuleRowProps> = ({ rule, onToggle, onEdit, onDelete }) => {
    const { t } = useTranslation();

    return (
        <Flex align='center' as='li' className={styles.row} gap={Spaces.M}>
            <Checkbox
                checked={rule.enabled}
                className={styles.name}
                label={rule.name}
                onChange={() => onToggle(rule)}
            />
            <Typography as='span' className={styles.type} color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {t(RULE_TYPE_LABELS[rule.type])}
            </Typography>
            <code className={styles.pattern}>{rule.match.url.value}</code>
            <Button size={ButtonSizes.SMALL} variant={ButtonVariants.GHOST} onClick={() => onEdit(rule)}>
                {t('rulesEdit')}
            </Button>
            <Button size={ButtonSizes.SMALL} variant={ButtonVariants.GHOST} onClick={() => onDelete(rule)}>
                {t('rulesDelete')}
            </Button>
        </Flex>
    );
};
