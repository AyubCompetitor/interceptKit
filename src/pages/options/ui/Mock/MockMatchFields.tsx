import type { FC } from 'react';

import { useMockDraftFields } from '../../lib/useMockDraftFields.ts';
import type { MockDraftFields } from '../../model/mockDraft.ts';

import { useTranslation } from '#shared/i18n';
import { HTTP_METHODS } from '#shared/lib';
import { Field, Flex, InfoTip, SegmentedControl, Spaces } from '#shared/ui';

import { Checklist } from '../Checklist/Checklist.tsx';
import { PatternExamples } from '../Fields/PatternExamples.tsx';
import styles from './MockForm.module.css';
import { PATTERN_HINTS, PATTERN_PLACEHOLDERS, SYNTAX_TYPE_LABELS } from '../Rule/ruleLabels.ts';

export const MockMatchFields: FC<MockDraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onSyntaxChange, onPatternChange, onMethodToggle } = useMockDraftFields(draft, onDraftChange);

    return (
        <Flex direction='column' gap={Spaces.L}>
            <SegmentedControl
                labels={SYNTAX_TYPE_LABELS}
                legend={t('ruleSyntax')}
                value={draft.syntaxType}
                onChange={onSyntaxChange}
            />

            <Field
                hint={t(PATTERN_HINTS[draft.syntaxType])}
                label={t('rulePattern')}
                labelAside={
                    <InfoTip label={t('patternExamplesLabel')}>
                        <PatternExamples syntaxType={draft.syntaxType} />
                    </InfoTip>
                }
            >
                <input
                    className={styles.code}
                    placeholder={t(PATTERN_PLACEHOLDERS[draft.syntaxType])}
                    spellCheck={false}
                    value={draft.pattern}
                    required
                    onChange={onPatternChange}
                />
            </Field>

            <Checklist
                hint={t('ruleMethodsHint')}
                legend={t('ruleMethods')}
                selected={draft.methods}
                values={HTTP_METHODS}
                onToggle={onMethodToggle}
            />
        </Flex>
    );
};
