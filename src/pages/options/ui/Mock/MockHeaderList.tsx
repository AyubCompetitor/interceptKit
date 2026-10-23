import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import type { KeyValueRow } from '#shared/lib';
import { KeyValueTable } from '#shared/ui';

import { MOCK_HEADER_LABELS } from './mockLabels.ts';
import styles from './MockHeaderList.module.css';

interface MockHeaderListProps {
    /** Rows of the list */
    headers: readonly KeyValueRow[];
    /** Called with the changed rows */
    onHeadersChange: (headers: KeyValueRow[]) => void;
}

export const MockHeaderList: FC<MockHeaderListProps> = ({ headers, onHeadersChange }) => {
    const { t } = useTranslation();

    return (
        <fieldset className={styles.group}>
            <legend className={styles.legend}>{t('mockHeaders')}</legend>

            <KeyValueTable labels={MOCK_HEADER_LABELS} rows={headers} isKeyRequired onRowsChange={onHeadersChange} />
        </fieldset>
    );
};
