import type { FC } from 'react';

import { useHeaderOpList } from '../../lib/useHeaderOpList.ts';
import type { HeaderOpDraft } from '../../model/ruleDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, Icon, IconNames, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import styles from './HeaderOpList.module.css';
import { HeaderOpRow } from './HeaderOpRow.tsx';

interface HeaderOpListProps {
    /** Caption of the group */
    legend: string;
    /** Rows of the group */
    ops: readonly HeaderOpDraft[];
    /** Called with the changed rows */
    onOpsChange: (ops: HeaderOpDraft[]) => void;
}

/** Header changes as a table: every field of a row is named for assistive technology, so the column titles are visual */
export const HeaderOpList: FC<HeaderOpListProps> = ({ legend, ops, onOpsChange }) => {
    const { t } = useTranslation();
    const { onOpAdd, onOpChange, onOpRemove } = useHeaderOpList(ops, onOpsChange);

    const hasOps = ops.length > 0;

    return (
        <fieldset className={styles.group}>
            <legend className={styles.legend}>{legend}</legend>

            {hasOps && (
                <div className={styles.table}>
                    <div aria-hidden='true' className={styles.columns}>
                        <span>{t('ruleHeaderName')}</span>
                        <span>{t('ruleHeaderOperation')}</span>
                        <span>{t('ruleHeaderValue')}</span>
                        <span />
                    </div>
                    {ops.map(op => (
                        <HeaderOpRow key={op.key} op={op} onChange={onOpChange} onRemove={onOpRemove} />
                    ))}
                </div>
            )}

            {!hasOps && (
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('ruleHeadersEmpty')}
                </Typography>
            )}

            <Button size={ButtonSizes.SMALL} onClick={onOpAdd}>
                <Icon name={IconNames.PLUS} />
                {t('ruleHeaderAdd')}
            </Button>
        </fieldset>
    );
};
