import type { FC } from 'react';

import { useRuleDraftFields } from '../../lib/useRuleDraftFields.ts';
import { useRuleForm } from '../../model/useRuleForm.ts';

import { RuleTypes, type Rule } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { Field, Flex, Spaces, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import { FormStep } from '../FormStep/FormStep.tsx';
import { HeaderFields } from '../Fields/HeaderFields.tsx';
import { MatchFields } from '../Fields/MatchFields.tsx';
import { RedirectFields } from '../Fields/RedirectFields.tsx';
import styles from './RuleForm.module.css';
import { RULE_TYPE_HINTS, RULE_TYPE_LABELS } from './ruleLabels.ts';
import { SegmentedControl } from '../SegmentedControl/SegmentedControl.tsx';

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

    const isRedirect = draft.type === RuleTypes.REDIRECT;
    const isHeaders = draft.type === RuleTypes.HEADERS;
    const isSaveFailed = saveError !== undefined;

    return (
        <form className={styles.form} id={formId} onSubmit={onRuleSubmit}>
            <Field label={t('ruleName')}>
                <input placeholder={t('ruleNamePlaceholder')} required value={draft.name} onChange={onNameChange} />
            </Field>

            <FormStep title={t('ruleStepMatch')}>
                <MatchFields draft={draft} onDraftChange={onDraftChange} />
            </FormStep>

            <FormStep title={t('ruleStepAction')}>
                <Flex direction='column' gap={Spaces.S}>
                    <SegmentedControl
                        labels={RULE_TYPE_LABELS}
                        legend={t('ruleType')}
                        value={draft.type}
                        isLegendHidden
                        onChange={onTypeChange}
                    />
                    <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                        {t(RULE_TYPE_HINTS[draft.type])}
                    </Typography>
                </Flex>

                {isRedirect && <RedirectFields draft={draft} onDraftChange={onDraftChange} />}

                {isHeaders && <HeaderFields draft={draft} onDraftChange={onDraftChange} />}
            </FormStep>

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('rulesSaveFailed', saveError)}
                </Typography>
            )}
        </form>
    );
};
