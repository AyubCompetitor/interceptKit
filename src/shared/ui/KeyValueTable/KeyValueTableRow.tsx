import type { FC } from 'react';

import { Button, ButtonSizes, ButtonVariants } from '../Button/index.ts';
import { Icon, IconNames } from '../Icon/index.ts';
import { Switch } from '../Switch/index.ts';

import { useTranslation } from '#shared/i18n';
import type { KeyValueRow } from '#shared/lib';

import styles from './KeyValueTableRow.module.css';
import type { KeyValueRowChange, KeyValueTableLabels } from './types.ts';
import { useKeyValueTableRow } from './useKeyValueTableRow.ts';

interface KeyValueTableRowProps {
    /** The edited pair */
    row: KeyValueRow;
    /** Texts of the table */
    labels: KeyValueTableLabels;
    /** Whether the form refuses a row without a key */
    isKeyRequired: boolean;
    /** Called with the changed fields of the row */
    onChange: KeyValueRowChange;
    /** Called with the id of the row to delete */
    onRemove: (rowId: string) => void;
}

export const KeyValueTableRow: FC<KeyValueTableRowProps> = ({ row, labels, isKeyRequired, onChange, onRemove }) => {
    const { t } = useTranslation();
    const { onEnabledToggle, onKeyChange, onValueChange, onRowRemove } = useKeyValueTableRow(row, onChange, onRemove);

    return (
        <div className={styles.row}>
            <Switch checked={row.enabled} label={t(labels.enabled)} isLabelHidden onChange={onEnabledToggle} />
            <input
                aria-label={t(labels.key)}
                className={styles.code}
                required={isKeyRequired}
                spellCheck={false}
                value={row.key}
                onChange={onKeyChange}
            />
            <input
                aria-label={t(labels.value)}
                className={styles.code}
                spellCheck={false}
                value={row.value}
                onChange={onValueChange}
            />
            <Button
                aria-label={t(labels.remove)}
                size={ButtonSizes.SMALL}
                title={t(labels.remove)}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={onRowRemove}
            >
                <Icon name={IconNames.CLOSE} />
            </Button>
        </div>
    );
};
