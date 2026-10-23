import type { FC } from 'react';

import { useHistoryClearing } from '../../lib/useHistoryClearing.ts';
import { useHistory } from '../../model/useHistory.ts';

import type { ApiRequest } from '#entities/request';
import { API_CLIENT_CONFIG } from '#shared/config';
import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, Icon, IconNames, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import { ClearHistoryModal } from './ClearHistoryModal.tsx';
import styles from './HistoryPanel.module.css';
import { HistoryRow } from './HistoryRow.tsx';

interface HistoryPanelProps {
    /** Opens a copy of the request in a new tab */
    onRequestOpen: (request: ApiRequest) => void;
}

const HISTORY_LIMIT = String(API_CLIENT_CONFIG.HISTORY_LIMIT);

export const HistoryPanel: FC<HistoryPanelProps> = ({ onRequestOpen }) => {
    const { t } = useTranslation();
    const { entries, isLoading, isActionFailed, onEntryDelete, onHistoryClear } = useHistory();
    const { isConfirmOpen, onClearRequest, onClearCancel, onClearConfirm } = useHistoryClearing(onHistoryClear);

    if (isLoading) {
        return null;
    }

    return (
        <section aria-label={t('apiClientHistory')} className={styles.panel}>
            {!!entries.length && (
                <ul className={styles.list}>
                    {entries.map(entry => (
                        <HistoryRow key={entry.id} entry={entry} onDelete={onEntryDelete} onOpen={onRequestOpen} />
                    ))}
                </ul>
            )}

            <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {t('apiClientHistoryHint', HISTORY_LIMIT)}
            </Typography>

            {!!entries.length && (
                <Button size={ButtonSizes.SMALL} onClick={onClearRequest}>
                    <Icon name={IconNames.DELETE} />
                    {t('apiClientHistoryClear')}
                </Button>
            )}

            {isActionFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientHistoryActionFailed')}
                </Typography>
            )}

            <ClearHistoryModal isOpen={isConfirmOpen} onCancel={onClearCancel} onConfirm={onClearConfirm} />
        </section>
    );
};
