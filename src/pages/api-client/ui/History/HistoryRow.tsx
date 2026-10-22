import type { FC } from 'react';

import { isErrorStatus, type ApiRequest, type HistoryEntry } from '#entities/request';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, ButtonVariants, Icon, IconNames, joinClassNames } from '#shared/ui';

import { formatSentAt } from './historyFormat.ts';
import styles from './HistoryRow.module.css';
import { formatRequestUrl } from '../Tabs/requestTabTitle.ts';

interface HistoryRowProps {
    /** A request that went out */
    entry: HistoryEntry;
    /** Opens a copy of the request in a new tab */
    onOpen: (request: ApiRequest) => void;
    /** Deletes the entry */
    onDelete: (entry: HistoryEntry) => void;
}

/** The whole row opens the request; the status is red for errors and for a request that got no response */
export const HistoryRow: FC<HistoryRowProps> = ({ entry, onOpen, onDelete }) => {
    const { locale, t } = useTranslation();

    const { request, response } = entry;
    const url = formatRequestUrl(request.url) ?? '';
    const status = response === undefined ? t('apiClientHistoryNoResponse') : String(response.status);
    const isFailed = response === undefined || isErrorStatus(response.status);

    return (
        <li className={styles.row}>
            <button className={styles.open} type='button' onClick={() => onOpen(request)}>
                <span className={styles.request}>
                    <span className={styles.method}>{request.method}</span>
                    <span className={styles.url}>{url}</span>
                </span>
                <span className={styles.meta}>
                    <span className={joinClassNames(isFailed && styles.isFailed)}>{status}</span>
                    <span>{formatSentAt(entry.sentAt, locale)}</span>
                </span>
            </button>

            <Button
                aria-label={t('apiClientHistoryDelete')}
                size={ButtonSizes.SMALL}
                title={t('apiClientHistoryDelete')}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={() => onDelete(entry)}
            >
                <Icon name={IconNames.CLOSE} />
            </Button>
        </li>
    );
};
