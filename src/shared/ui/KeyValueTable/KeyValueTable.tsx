import type { FC } from 'react';

import { Button, ButtonSizes } from '../Button/index.ts';
import { Icon, IconNames } from '../Icon/index.ts';
import { Typography, TypographyColors, TypographySizes } from '../Typography/index.ts';

import { useTranslation } from '#shared/i18n';
import type { KeyValueRow } from '#shared/lib';

import styles from './KeyValueTable.module.css';
import { KeyValueTableRow } from './KeyValueTableRow.tsx';
import type { KeyValueTableLabels } from './types.ts';
import { useKeyValueTable } from './useKeyValueTable.ts';

interface KeyValueTableProps {
    /** Texts of the columns, the controls and the empty table */
    labels: KeyValueTableLabels;
    /** Rows of the table */
    rows: readonly KeyValueRow[];
    /** Whether the form refuses a row without a key */
    isKeyRequired?: boolean;
    /** Called with the changed rows */
    onRowsChange: (rows: KeyValueRow[]) => void;
}

/** Pairs that can be switched off; every field of a row is named for assistive technology, so the column titles are visual */
export const KeyValueTable: FC<KeyValueTableProps> = ({ labels, rows, isKeyRequired = false, onRowsChange }) => {
    const { t } = useTranslation();
    const { onRowAdd, onRowChange, onRowRemove } = useKeyValueTable(rows, onRowsChange);

    const hasRows = rows.length > 0;

    return (
        <div className={styles.content}>
            {hasRows && (
                <div className={styles.table}>
                    <div aria-hidden='true' className={styles.columns}>
                        <span />
                        <span>{t(labels.key)}</span>
                        <span>{t(labels.value)}</span>
                        <span />
                    </div>
                    {rows.map(row => (
                        <KeyValueTableRow
                            key={row.rowId}
                            isKeyRequired={isKeyRequired}
                            labels={labels}
                            row={row}
                            onChange={onRowChange}
                            onRemove={onRowRemove}
                        />
                    ))}
                </div>
            )}

            {!hasRows && (
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t(labels.empty)}
                </Typography>
            )}

            <Button size={ButtonSizes.SMALL} onClick={onRowAdd}>
                <Icon name={IconNames.PLUS} />
                {t(labels.add)}
            </Button>
        </div>
    );
};
