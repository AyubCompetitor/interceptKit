import type { ChangeEvent, FC } from 'react';

import type { VariableDraft, VariableDraftChange } from '../../model/environmentDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, ButtonVariants, Checkbox, Icon, IconNames, joinClassNames, Switch } from '#shared/ui';

import styles from './VariableTableRow.module.css';

interface VariableTableRowProps {
    /** The edited variable */
    variable: VariableDraft;
    /** Called with the changed fields of the row */
    onChange: VariableDraftChange;
    /** Called with the id of the row to delete */
    onRemove: (rowId: string) => void;
}

export const VariableTableRow: FC<VariableTableRowProps> = ({ variable, onChange, onRemove }) => {
    const { t } = useTranslation();

    const { rowId, enabled, secret } = variable;

    const isEncrypted = variable.encryptedValue !== undefined;
    const valuePlaceholder = isEncrypted ? t('apiClientVariableEncrypted') : undefined;

    const onRowRemove = () => onRemove(rowId);

    const onEnabledToggle = () => onChange(rowId, { enabled: !enabled });

    const onSecretToggle = () => onChange(rowId, { secret: !secret });

    const onKeyChange = (event: ChangeEvent<HTMLInputElement>) =>
        onChange(rowId, {
            key: event.target.value,
        });

    const onValueChange = (event: ChangeEvent<HTMLInputElement>) =>
        onChange(rowId, {
            value: event.target.value,
        });

    return (
        <div className={styles.row}>
            <Switch
                checked={variable.enabled}
                label={t('apiClientVariableEnabled')}
                isLabelHidden
                onChange={onEnabledToggle}
            />

            <input
                aria-label={t('apiClientVariableKey')}
                className={styles.code}
                spellCheck={false}
                value={variable.key}
                required
                onChange={onKeyChange}
            />

            <input
                aria-label={t('apiClientValue')}
                autoComplete='off'
                className={joinClassNames(styles.code, variable.secret && styles.masked)}
                placeholder={valuePlaceholder}
                spellCheck={false}
                value={variable.value}
                onChange={onValueChange}
            />

            <Checkbox
                checked={variable.secret}
                className={styles.secret}
                label={t('apiClientVariableSecret')}
                isLabelHidden
                onChange={onSecretToggle}
            />

            <Button
                aria-label={t('apiClientVariableDelete')}
                size={ButtonSizes.SMALL}
                title={t('apiClientVariableDelete')}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={onRowRemove}
            >
                <Icon name={IconNames.CLOSE} />
            </Button>
        </div>
    );
};
