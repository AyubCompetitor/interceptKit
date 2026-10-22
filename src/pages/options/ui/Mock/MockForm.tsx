import type { FC } from 'react';

import { useMockDraftFields } from '../../lib/useMockDraftFields.ts';
import { useMockForm } from '../../model/useMockForm.ts';

import type { Mock } from '#entities/mock';
import { useTranslation } from '#shared/i18n';
import { Field, Typography, TypographyColors } from '#shared/ui';

import { FormStep } from '../FormStep/FormStep.tsx';
import styles from './MockForm.module.css';
import { MockMatchFields } from './MockMatchFields.tsx';
import { MockResponseFields } from './MockResponseFields.tsx';

interface MockFormProps {
    /** Id the submit button in the dialog footer points at */
    formId: string;
    /** Mock to edit, or undefined for a new one */
    mock: NotRequired<Mock>;
    /** Called once the background has saved the mock */
    onSaved: VoidFunction;
}

export const MockForm: FC<MockFormProps> = ({ formId, mock, onSaved }) => {
    const { t } = useTranslation();
    const { draft, saveError, onDraftChange, onMockSubmit } = useMockForm(mock, onSaved);
    const { onNameChange } = useMockDraftFields(draft, onDraftChange);

    const isSaveFailed = saveError !== undefined;

    return (
        <form className={styles.form} id={formId} onSubmit={onMockSubmit}>
            <Field label={t('mockName')}>
                <input placeholder={t('mockNamePlaceholder')} required value={draft.name} onChange={onNameChange} />
            </Field>

            <FormStep title={t('mockStepMatch')}>
                <MockMatchFields draft={draft} onDraftChange={onDraftChange} />
            </FormStep>

            <FormStep title={t('mockStepResponse')}>
                <MockResponseFields draft={draft} onDraftChange={onDraftChange} />
            </FormStep>

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('mocksSaveFailed', saveError)}
                </Typography>
            )}
        </form>
    );
};
