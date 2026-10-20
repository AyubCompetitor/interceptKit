import type { FC } from 'react';

import { useRuleDraftFields } from '../lib/useRuleDraftFields.ts';

import { RESOURCE_TYPES } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { HTTP_METHODS } from '#shared/lib';
import { Field, Flex, Spaces, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import { Checklist } from './Checklist.tsx';
import { ChoiceSelect } from './ChoiceSelect.tsx';
import type { DraftFieldsProps } from './DraftFieldsProps.ts';
import styles from './MatchFields.module.css';
import { SYNTAX_TYPE_LABELS } from './ruleLabels.ts';

export const MatchFields: FC<DraftFieldsProps> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onSyntaxChange, onPatternChange, onMethodToggle, onResourceTypeToggle, onInitiatorDomainsChange } =
        useRuleDraftFields(draft, onDraftChange);

    return (
        <Flex direction='column' gap={Spaces.S}>
            <Flex gap={Spaces.M}>
                <Field label={t('ruleSyntax')}>
                    <ChoiceSelect labels={SYNTAX_TYPE_LABELS} value={draft.syntaxType} onChange={onSyntaxChange} />
                </Field>
                <Field className={styles.pattern} label={t('rulePattern')}>
                    <input required value={draft.pattern} onChange={onPatternChange} />
                </Field>
            </Flex>
            <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {t('rulePatternHint')}
            </Typography>
            <details className={styles.conditions}>
                <summary className={styles.summary}>{t('ruleConditions')}</summary>
                <Flex direction='column' gap={Spaces.M}>
                    <Checklist
                        legend={t('ruleMethods')}
                        selected={draft.methods}
                        values={HTTP_METHODS}
                        onToggle={onMethodToggle}
                    />
                    <Flex direction='column' gap={Spaces.XS}>
                        <Checklist
                            legend={t('ruleResourceTypes')}
                            selected={draft.resourceTypes}
                            values={RESOURCE_TYPES}
                            onToggle={onResourceTypeToggle}
                        />
                        <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                            {t('ruleResourceTypesHint')}
                        </Typography>
                    </Flex>
                    <Flex direction='column' gap={Spaces.XS}>
                        <Field label={t('ruleInitiatorDomains')}>
                            <input value={draft.initiatorDomains} onChange={onInitiatorDomainsChange} />
                        </Field>
                        <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                            {t('ruleInitiatorDomainsHint')}
                        </Typography>
                    </Flex>
                </Flex>
            </details>
        </Flex>
    );
};
