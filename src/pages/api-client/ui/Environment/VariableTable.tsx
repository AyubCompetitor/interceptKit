import type { FC } from 'react';

import {
    createVariableDraft,
    updateVariableDraft,
    type VariableDraft,
    type VariableDraftPatch,
} from '../../model/environmentDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, Icon, IconNames, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import styles from './VariableTable.module.css';
import { VariableTableRow } from './VariableTableRow.tsx';

interface VariableTableProps {
    /** Variables of the environment */
    variables: readonly VariableDraft[];
    /** Called with the changed variables */
    onVariablesChange: (variables: VariableDraft[]) => void;
}

/** Every field of a row is named for assistive technology, so the column titles are visual */
export const VariableTable: FC<VariableTableProps> = ({ variables, onVariablesChange }) => {
    const { t } = useTranslation();

    const onVariableAdd = () => onVariablesChange([...variables, createVariableDraft()]);

    const onVariableChange = (rowId: string, patch: VariableDraftPatch) =>
        onVariablesChange(updateVariableDraft(variables, rowId, patch));

    const onVariableRemove = (rowId: string) =>
        onVariablesChange(variables.filter(variable => variable.rowId !== rowId));

    return (
        <fieldset className={styles.group}>
            <legend className={styles.legend}>{t('apiClientVariables')}</legend>

            {!!variables.length && (
                <div className={styles.table}>
                    <div aria-hidden='true' className={styles.columns}>
                        <span />
                        <span>{t('apiClientVariableKey')}</span>
                        <span>{t('apiClientValue')}</span>
                        <span>{t('apiClientVariableSecret')}</span>
                        <span />
                    </div>
                    {variables.map(variable => (
                        <VariableTableRow
                            key={variable.rowId}
                            variable={variable}
                            onChange={onVariableChange}
                            onRemove={onVariableRemove}
                        />
                    ))}
                </div>
            )}

            <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {t('apiClientVariablesHint')}
            </Typography>

            <Button size={ButtonSizes.SMALL} onClick={onVariableAdd}>
                <Icon name={IconNames.PLUS} />
                {t('apiClientVariableAdd')}
            </Button>
        </fieldset>
    );
};
