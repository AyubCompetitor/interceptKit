import type { FC } from 'react';

import { useRuleDraftFields } from '../lib/useRuleDraftFields.ts';

import { useTranslation } from '#shared/i18n';
import { Field, Flex, Spaces, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import { ChoiceSelect } from './ChoiceSelect.tsx';
import type { DraftFieldsProps } from './DraftFieldsProps.ts';
import styles from './RedirectFields.module.css';
import { SCHEME_LABELS, TARGET_TYPE_LABELS } from './ruleLabels.ts';

export const RedirectFields: FC<DraftFieldsProps> = ({ draft, onDraftChange }) => {
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

    const isUrlTarget = draft.targetType === 'url';
    const isSubstitutionTarget = draft.targetType === 'regexSubstitution';
    const isTransformTarget = draft.targetType === 'transform';

    return (
        <Flex direction='column' gap={Spaces.S}>
            <Field label={t('ruleTarget')}>
                <ChoiceSelect labels={TARGET_TYPE_LABELS} value={draft.targetType} onChange={onTargetTypeChange} />
            </Field>

            {isUrlTarget && (
                <Field label={t('ruleTargetUrlLabel')}>
                    <input required value={draft.url} onChange={onUrlChange} />
                </Field>
            )}

            {isSubstitutionTarget && (
                <>
                    <Field label={t('ruleSubstitution')}>
                        <input required value={draft.regexSubstitution} onChange={onSubstitutionChange} />
                    </Field>
                    <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                        {t('ruleSubstitutionHint')}
                    </Typography>
                </>
            )}

            {isTransformTarget && (
                <>
                    <Flex gap={Spaces.M} isWrapped>
                        <Field label={t('ruleScheme')}>
                            <ChoiceSelect labels={SCHEME_LABELS} value={draft.scheme} onChange={onSchemeChange} />
                        </Field>
                        <Field className={styles.part} label={t('ruleHost')}>
                            <input value={draft.host} onChange={onHostChange} />
                        </Field>
                        <Field className={styles.port} label={t('rulePort')}>
                            <input inputMode='numeric' value={draft.port} onChange={onPortChange} />
                        </Field>
                        <Field className={styles.part} label={t('rulePath')}>
                            <input value={draft.path} onChange={onPathChange} />
                        </Field>
                    </Flex>
                    <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                        {t('ruleTransformHint')}
                    </Typography>
                </>
            )}
        </Flex>
    );
};
