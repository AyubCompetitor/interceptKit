import type { FC } from 'react';

import { useHeaderOpRow } from '../lib/useHeaderOpRow.ts';
import type { HeaderOpChange, HeaderOpDraft } from '../model/ruleDraft.ts';

import { HeaderOperations } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, ButtonVariants, Field, Flex, Spaces } from '#shared/ui';

import { ChoiceSelect } from './ChoiceSelect.tsx';
import styles from './HeaderOpRow.module.css';
import { HEADER_OPERATION_LABELS } from './ruleLabels.ts';

interface HeaderOpRowProps {
    /** The edited header change */
    op: HeaderOpDraft;
    /** Called with the changed fields of the row */
    onChange: HeaderOpChange;
    /** Called with the key of the row to delete */
    onRemove: (key: string) => void;
}

export const HeaderOpRow: FC<HeaderOpRowProps> = ({ op, onChange, onRemove }) => {
    const { t } = useTranslation();
    const { onNameChange, onOperationChange, onValueChange, onRowRemove } = useHeaderOpRow(op, onChange, onRemove);

    const isRemoval = op.operation === HeaderOperations.REMOVE;

    return (
        <Flex align='end' className={styles.row} gap={Spaces.S}>
            <Field className={styles.name} label={t('ruleHeaderName')}>
                <input required value={op.name} onChange={onNameChange} />
            </Field>
            <Field label={t('ruleHeaderOperation')}>
                <ChoiceSelect labels={HEADER_OPERATION_LABELS} value={op.operation} onChange={onOperationChange} />
            </Field>
            <Field className={styles.value} label={t('ruleHeaderValue')}>
                <input disabled={isRemoval} value={op.value} onChange={onValueChange} />
            </Field>
            <Button
                aria-label={t('ruleHeaderDelete')}
                size={ButtonSizes.SMALL}
                variant={ButtonVariants.GHOST}
                onClick={onRowRemove}
            >
                <span aria-hidden='true' className={styles.removeIcon}>
                    ×
                </span>
            </Button>
        </Flex>
    );
};
