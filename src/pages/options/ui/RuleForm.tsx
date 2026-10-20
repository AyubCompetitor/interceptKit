import type { FC } from 'react';

import { useRuleDraftFields } from '../lib/useRuleDraftFields.ts';
import { useRuleForm } from '../model/useRuleForm.ts';

import type { Rule } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { Field, Typography, TypographyColors } from '#shared/ui';

import { ChoiceSelect } from './ChoiceSelect.tsx';
import { HeaderFields } from './HeaderFields.tsx';
import { MatchFields } from './MatchFields.tsx';
import { RedirectFields } from './RedirectFields.tsx';
import styles from './RuleForm.module.css';
import { RULE_TYPE_LABELS } from './ruleLabels.ts';

interface RuleFormProps {
    /** Id the submit button in the dialog footer points at */
    formId: string;
    /** Rule to edit, or undefined for a new one */
    rule: NotRequired<Rule>;
    /** Called once the background has saved the rule */
    onSaved: VoidFunction;
}

export const RuleForm: FC<RuleFormProps> = ({ formId, rule, onSaved }) => {
    const { t } = useTranslation();
    const { draft, saveError, onDraftChange, onRuleSubmit } = useRuleForm(rule, onSaved);
    const { onNameChange, onTypeChange } = useRuleDraftFields(draft, onDraftChange);

    const isRedirect = draft.type === 'redirect';
    const isHeaders = draft.type === 'headers';
    const isBlock = draft.type === 'block';
    const isSaveFailed = saveError !== undefined;

    return (
        <form className={styles.form} id={formId} onSubmit={onRuleSubmit}>
            <Field label={t('ruleName')}>
                <input required value={draft.name} onChange={onNameChange} />
            </Field>

            <Field label={t('ruleType')}>
                <ChoiceSelect labels={RULE_TYPE_LABELS} value={draft.type} onChange={onTypeChange} />
            </Field>

            <MatchFields draft={draft} onDraftChange={onDraftChange} />

            {isRedirect && <RedirectFields draft={draft} onDraftChange={onDraftChange} />}

            {isHeaders && <HeaderFields draft={draft} onDraftChange={onDraftChange} />}

            {isBlock && <Typography color={TypographyColors.HINT}>{t('ruleBlockHint')}</Typography>}

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('rulesSaveFailed', saveError)}
                </Typography>
            )}
        </form>
    );
};
