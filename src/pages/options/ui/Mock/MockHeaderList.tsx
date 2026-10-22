import type { FC } from 'react';

import { useMockHeaderList } from '../../lib/useMockHeaderList.ts';
import type { MockHeaderDraft } from '../../model/mockDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, Icon, IconNames, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import styles from './MockHeaderList.module.css';
import { MockHeaderRow } from './MockHeaderRow.tsx';

interface MockHeaderListProps {
    /** Rows of the list */
    headers: readonly MockHeaderDraft[];
    /** Called with the changed rows */
    onHeadersChange: (headers: MockHeaderDraft[]) => void;
}

/** Response headers as a table: every field of a row is named for assistive technology, so the column titles are visual */
export const MockHeaderList: FC<MockHeaderListProps> = ({ headers, onHeadersChange }) => {
    const { t } = useTranslation();
    const { onHeaderAdd, onHeaderChange, onHeaderRemove } = useMockHeaderList(headers, onHeadersChange);

    const hasHeaders = headers.length > 0;

    return (
        <fieldset className={styles.group}>
            <legend className={styles.legend}>{t('mockHeaders')}</legend>

            {hasHeaders && (
                <div className={styles.table}>
                    <div aria-hidden='true' className={styles.columns}>
                        <span />
                        <span>{t('mockHeaderName')}</span>
                        <span>{t('mockHeaderValue')}</span>
                        <span />
                    </div>
                    {headers.map(header => (
                        <MockHeaderRow
                            key={header.rowId}
                            header={header}
                            onChange={onHeaderChange}
                            onRemove={onHeaderRemove}
                        />
                    ))}
                </div>
            )}

            {!hasHeaders && (
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('mockHeadersEmpty')}
                </Typography>
            )}

            <Button size={ButtonSizes.SMALL} onClick={onHeaderAdd}>
                <Icon name={IconNames.PLUS} />
                {t('mockHeaderAdd')}
            </Button>
        </fieldset>
    );
};
