import type { ChangeEvent, FC } from 'react';

import { Button, ButtonSizes, ButtonVariants } from '../Button/index.ts';
import { Icon, IconNames } from '../Icon/index.ts';
import { Switch } from '../Switch/index.ts';
import { TemplateInput } from '../TemplateInput/index.ts';

import { useTranslation } from '#shared/i18n';
import type { KeyValueRow } from '#shared/lib';

import styles from './KeyValueTableRow.module.css';
import type { KeyValueRowChange, KeyValueTableLabels } from './types.ts';

interface KeyValueTableRowProps {
    /** The edited pair */
    row: KeyValueRow;
    /** Texts of the table */
    labels: KeyValueTableLabels;
    /** Whether the form refuses a row without a key */
    isKeyRequired: boolean;
    /** Whether the fields colour {{templates}} */
    isWithTemplates: boolean;
    /** Called with the changed fields of the row */
    onChange: KeyValueRowChange;
    /** Called with the id of the row to delete */
    onRemove: (rowId: string) => void;
}

export const KeyValueTableRow: FC<KeyValueTableRowProps> = ({
    row,
    labels,
    isKeyRequired,
    isWithTemplates,
    onChange,
    onRemove,
}) => {
    const { rowId, enabled } = row;

    const { t } = useTranslation();

    const Input = isWithTemplates ? TemplateInput : 'input';

    const onKeyChange = (event: ChangeEvent<HTMLInputElement>) => onChange(rowId, { key: event.target.value });

    const onValueChange = (event: ChangeEvent<HTMLInputElement>) => onChange(rowId, { value: event.target.value });

    const onEnabledToggle = () => onChange(rowId, { enabled: !enabled });

    const onRowRemove = () => onRemove(rowId);

    return (
        <div className={styles.row}>
            <Switch checked={row.enabled} label={t(labels.enabled)} isLabelHidden onChange={onEnabledToggle} />

            <Input
                aria-label={t(labels.key)}
                className={styles.code}
                required={isKeyRequired}
                spellCheck={false}
                value={row.key}
                onChange={onKeyChange}
            />

            <Input
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
