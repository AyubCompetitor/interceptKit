import type { FC } from 'react';

import type { ApiRequest, HistoryEntry } from '#entities/request';
import type { Locale } from '#shared/config';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, ButtonVariants, Icon, IconNames, MethodLabel, StatusCode } from '#shared/ui';

import styles from './HistoryRow.module.css';
import { formatRequestUrl } from '../Tabs/requestTabTitle.ts';

/** Date and time of sending in the language of the interface */
const formatSentAt = (sentAt: number, locale: Locale): string =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(sentAt);

interface HistoryRowProps {
    /** A request that went out */
    entry: HistoryEntry;
    /** Opens a copy of the request in a new tab */
    onOpen: (request: ApiRequest) => void;
    /** Opens the request as a cURL command */
    onCurlExport: (request: ApiRequest) => void;
    /** Deletes the entry */
    onDelete: (entry: HistoryEntry) => void;
}

/** The whole row opens the request; a request that got no response says so in red */
export const HistoryRow: FC<HistoryRowProps> = ({ entry, onOpen, onCurlExport, onDelete }) => {
    const { request, response } = entry;

    const { locale, t } = useTranslation();

    const url = formatRequestUrl(request.url) ?? '';

    return (
        <li className={styles.row}>
            <button className={styles.open} type='button' onClick={() => onOpen(request)}>
                <span className={styles.request}>
                    <MethodLabel method={request.method} />
                    <span className={styles.url}>{url}</span>
                </span>
                <span className={styles.meta}>
                    {response && <StatusCode status={response.status} />}

                    {!response && <span className={styles.isFailed}>{t('apiClientHistoryNoResponse')}</span>}
                    <span>{formatSentAt(entry.sentAt, locale)}</span>
                </span>
            </button>

            <Button
                aria-label={t('apiClientCurlExportOpen')}
                size={ButtonSizes.SMALL}
                title={t('apiClientCurlExportOpen')}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={() => onCurlExport(request)}
            >
                <Icon name={IconNames.COPY} />
            </Button>

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
