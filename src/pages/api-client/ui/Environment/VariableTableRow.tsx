import type { FC } from 'react';

import { useVariableTableRow } from '../../lib/useVariableTableRow.ts';
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

/** A secret value is hidden until its field has focus; it is plain text, so no password manager offers to keep it */
export const VariableTableRow: FC<VariableTableRowProps> = ({ variable, onChange, onRemove }) => {
    const { t } = useTranslation();
    const { onEnabledToggle, onKeyChange, onValueChange, onSecretToggle, onRowRemove } = useVariableTableRow(
        variable,
        onChange,
        onRemove,
    );

    const isEncrypted = variable.encryptedValue !== undefined;
    const valuePlaceholder = isEncrypted ? t('apiClientVariableEncrypted') : undefined;

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
