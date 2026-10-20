import type { FC } from 'react';

import { useHeaderOpList } from '../lib/useHeaderOpList.ts';
import type { HeaderOpDraft } from '../model/ruleDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, Flex, Spaces } from '#shared/ui';

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

export const HeaderOpList: FC<HeaderOpListProps> = ({ legend, ops, onOpsChange }) => {
    const { t } = useTranslation();
    const { onOpAdd, onOpChange, onOpRemove } = useHeaderOpList(ops, onOpsChange);

    return (
        <fieldset className={styles.group}>
            <legend className={styles.legend}>{legend}</legend>
            <Flex align='start' direction='column' gap={Spaces.S}>
                {ops.map(op => (
                    <HeaderOpRow key={op.key} op={op} onChange={onOpChange} onRemove={onOpRemove} />
                ))}
                <Button size={ButtonSizes.SMALL} onClick={onOpAdd}>
                    {t('ruleHeaderAdd')}
                </Button>
            </Flex>
        </fieldset>
    );
};
