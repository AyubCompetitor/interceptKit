import type { FC } from 'react';

import { useHeaderOpRow } from '../../lib/useHeaderOpRow.ts';
import type { HeaderOpChange, HeaderOpDraft } from '../../model/ruleDraft.ts';

import { HeaderOperations } from '#entities/rule';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, ButtonVariants, Icon, IconNames } from '#shared/ui';

import { ChoiceSelect } from '../ChoiceSelect/ChoiceSelect.tsx';
import styles from './HeaderOpRow.module.css';
import { HEADER_OPERATION_LABELS } from '../Rule/ruleLabels.ts';

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
        <div className={styles.row}>
            <input
                aria-label={t('ruleHeaderName')}
                className={styles.code}
                spellCheck={false}
                value={op.name}
                required
                onChange={onNameChange}
            />
            <ChoiceSelect
                label={t('ruleHeaderOperation')}
                labels={HEADER_OPERATION_LABELS}
                value={op.operation}
                onChange={onOperationChange}
            />
            <input
                aria-label={t('ruleHeaderValue')}
                className={styles.code}
                disabled={isRemoval}
                spellCheck={false}
                value={op.value}
                onChange={onValueChange}
            />
            <Button
                aria-label={t('ruleHeaderDelete')}
                size={ButtonSizes.SMALL}
                title={t('ruleHeaderDelete')}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={onRowRemove}
            >
                <Icon name={IconNames.CLOSE} />
            </Button>
        </div>
    );
};
