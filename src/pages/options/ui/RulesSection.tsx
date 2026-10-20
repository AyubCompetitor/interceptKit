import { useId, type FC } from 'react';

import { useRuleDeletion } from '../lib/useRuleDeletion.ts';
import { useRuleEditor } from '../lib/useRuleEditor.ts';
import { useRuleList } from '../model/useRuleList.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonVariants, Flex, Spaces, Typography, TypographyColors } from '#shared/ui';

import { DeleteRuleModal } from './DeleteRuleModal.tsx';
import { RuleEditor } from './RuleEditor.tsx';
import { RuleRow } from './RuleRow.tsx';
import styles from './RulesSection.module.css';

export const RulesSection: FC = () => {
    const id = useId();

    const { t } = useTranslation();
    const { rules, isActionFailed, onRuleToggle, onRuleDelete } = useRuleList();
    const { ruleToDelete, onDeleteRequest, onDeleteCancel, onDeleteConfirm } = useRuleDeletion(onRuleDelete);
    const { editedRule, isEditorOpen, onRuleCreate, onRuleEdit, onEditorClose } = useRuleEditor();

    if (!rules) {
        return null;
    }

    return (
        <Flex aria-labelledby={`${id}-title`} as='section' direction='column' gap={Spaces.M}>
            <Flex align='center' gap={Spaces.M} justify='between'>
                <h2 id={`${id}-title`}>{t('sectionRules')}</h2>
                <Button variant={ButtonVariants.PRIMARY} onClick={onRuleCreate}>
                    {t('rulesAdd')}
                </Button>
            </Flex>

            <Typography color={TypographyColors.HINT}>{t('rulesHint')}</Typography>

            {!!rules.length && (
                <ul className={styles.list}>
                    {rules.map(rule => (
                        <RuleRow
                            key={rule.id}
                            rule={rule}
                            onDelete={onDeleteRequest}
                            onEdit={onRuleEdit}
                            onToggle={onRuleToggle}
                        />
                    ))}
                </ul>
            )}

            {!rules.length && <Typography color={TypographyColors.HINT}>{t('rulesEmpty')}</Typography>}

            {isActionFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('rulesActionFailed')}
                </Typography>
            )}

            <RuleEditor isOpen={isEditorOpen} rule={editedRule} onClose={onEditorClose} />

            <DeleteRuleModal rule={ruleToDelete} onCancel={onDeleteCancel} onConfirm={onDeleteConfirm} />
        </Flex>
    );
};
