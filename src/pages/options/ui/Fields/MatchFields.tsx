import type { FC } from 'react';

import { useRuleDraftFields } from '../../lib/useRuleDraftFields.ts';
import { countDraftConditions, type DraftFields } from '../../model/ruleDraft.ts';

import { RESOURCE_TYPES } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { HTTP_METHODS } from '#shared/lib';
import { Badge, Field, Flex, Icon, IconNames, SegmentedControl, Spaces } from '#shared/ui';

import { Checklist } from '../Checklist/Checklist.tsx';
import { PATTERN_HINTS, PATTERN_PLACEHOLDERS, RESOURCE_TYPE_LABELS, SYNTAX_TYPE_LABELS } from '../Rule/ruleLabels.ts';

import styles from './MatchFields.module.css';

export const MatchFields: FC<DraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onSyntaxChange, onPatternChange, onMethodToggle, onResourceTypeToggle, onInitiatorDomainsChange } =
        useRuleDraftFields(draft, onDraftChange);

    const conditionCount = countDraftConditions(draft);

    return (
        <Flex direction='column' gap={Spaces.L}>
            <SegmentedControl
                labels={SYNTAX_TYPE_LABELS}
                legend={t('ruleSyntax')}
                value={draft.syntaxType}
                onChange={onSyntaxChange}
            />

            <Field hint={t(PATTERN_HINTS[draft.syntaxType])} label={t('rulePattern')}>
                <input
                    className={styles.code}
                    placeholder={t(PATTERN_PLACEHOLDERS[draft.syntaxType])}
                    spellCheck={false}
                    value={draft.pattern}
                    required
                    onChange={onPatternChange}
                />
            </Field>

            <details className={styles.conditions}>
                <summary className={styles.summary}>
                    <Icon className={styles.chevron} name={IconNames.CHEVRON} />

                    {t('ruleConditions')}

                    {!!conditionCount && <Badge>{conditionCount}</Badge>}
                </summary>

                <Flex className={styles.conditionList} direction='column' gap={Spaces.XL}>
                    <Checklist
                        hint={t('ruleMethodsHint')}
                        legend={t('ruleMethods')}
                        selected={draft.methods}
                        values={HTTP_METHODS}
                        onToggle={onMethodToggle}
                    />
                    <Checklist
                        hint={t('ruleResourceTypesHint')}
                        labels={RESOURCE_TYPE_LABELS}
                        legend={t('ruleResourceTypes')}
                        selected={draft.resourceTypes}
                        values={RESOURCE_TYPES}
                        onToggle={onResourceTypeToggle}
                    />
                    <Field hint={t('ruleInitiatorDomainsHint')} label={t('ruleInitiatorDomains')}>
                        <input
                            placeholder={t('ruleInitiatorDomainsPlaceholder')}
                            spellCheck={false}
                            value={draft.initiatorDomains}
                            onChange={onInitiatorDomainsChange}
                        />
                    </Field>
                </Flex>
            </details>
        </Flex>
    );
};
