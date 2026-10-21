import type { FC } from 'react';

import { useRuleDraftFields } from '../../lib/useRuleDraftFields.ts';
import type { DraftFields, RuleDraft } from '../../model/ruleDraft.ts';

import { RuleTargetTypes } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { SyntaxTypes } from '#shared/lib';
import { Field, Flex, Notice, NoticeTones, Spaces, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import { ChoiceSelect } from '../ChoiceSelect/ChoiceSelect.tsx';
import { SCHEME_LABELS, TARGET_TYPE_LABELS } from '../Rule/ruleLabels.ts';
import { SegmentedControl } from '../SegmentedControl/SegmentedControl.tsx';

import styles from './RedirectFields.module.css';

const getDraftAccessibility = (draft: RuleDraft) => {
    const isUrlTarget = draft.targetType === RuleTargetTypes.URL;
    const isSubstitutionTarget = draft.targetType === RuleTargetTypes.RGX_SUBSTITUTION;
    const isTransformTarget = draft.targetType === RuleTargetTypes.TRANSFORM;
    const isFilterPattern = draft.syntaxType === SyntaxTypes.FILTER;
    const isRgxMissing = isSubstitutionTarget && isFilterPattern;

    return {
        isUrlTarget,
        isRgxMissing,
        isFilterPattern,
        isTransformTarget,
        isSubstitutionTarget,
    };
};

export const RedirectFields: FC<DraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();

    const {
        onTargetTypeChange,
        onUrlChange,
        onSubstitutionChange,
        onSchemeChange,
        onHostChange,
        onPortChange,
        onPathChange,
    } = useRuleDraftFields(draft, onDraftChange);

    const { isUrlTarget, isRgxMissing, isTransformTarget, isSubstitutionTarget } = getDraftAccessibility(draft);

    return (
        <Flex direction='column' gap={Spaces.L}>
            <SegmentedControl
                labels={TARGET_TYPE_LABELS}
                legend={t('ruleTarget')}
                value={draft.targetType}
                onChange={onTargetTypeChange}
            />

            {isUrlTarget && (
                <Field label={t('ruleTargetUrlLabel')}>
                    <input
                        placeholder={t('ruleTargetUrlPlaceholder')}
                        spellCheck={false}
                        value={draft.url}
                        required
                        onChange={onUrlChange}
                    />
                </Field>
            )}

            {isRgxMissing && <Notice tone={NoticeTones.WARNING}>{t('ruleSubstitutionNeedsRegex')}</Notice>}

            {isSubstitutionTarget && (
                <Field hint={t('ruleSubstitutionHint')} label={t('ruleSubstitution')}>
                    <input
                        className={styles.code}
                        placeholder={t('ruleSubstitutionPlaceholder')}
                        spellCheck={false}
                        value={draft.regexSubstitution}
                        required
                        onChange={onSubstitutionChange}
                    />
                </Field>
            )}

            {isTransformTarget && (
                <Flex direction='column' gap={Spaces.S}>
                    <div className={styles.parts}>
                        <Field label={t('ruleScheme')}>
                            <ChoiceSelect labels={SCHEME_LABELS} value={draft.scheme} onChange={onSchemeChange} />
                        </Field>
                        <Field label={t('ruleHost')}>
                            <input spellCheck={false} value={draft.host} onChange={onHostChange} />
                        </Field>
                        <Field label={t('rulePort')}>
                            <input inputMode='numeric' value={draft.port} onChange={onPortChange} />
                        </Field>
                        <Field label={t('rulePath')}>
                            <input spellCheck={false} value={draft.path} onChange={onPathChange} />
                        </Field>
                    </div>
                    <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                        {t('ruleTransformHint')}
                    </Typography>
                </Flex>
            )}
        </Flex>
    );
};
