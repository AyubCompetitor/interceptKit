import type { FC } from 'react';

import { useMockHeaderRow } from '../../lib/useMockHeaderRow.ts';
import type { MockHeaderChange, MockHeaderDraft } from '../../model/mockDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Button, ButtonSizes, ButtonVariants, Icon, IconNames, Switch } from '#shared/ui';

import styles from './MockHeaderRow.module.css';

interface MockHeaderRowProps {
    /** The edited header */
    header: MockHeaderDraft;
    /** Called with the changed fields of the row */
    onChange: MockHeaderChange;
    /** Called with the id of the row to delete */
    onRemove: (rowId: string) => void;
}

export const MockHeaderRow: FC<MockHeaderRowProps> = ({ header, onChange, onRemove }) => {
    const { t } = useTranslation();
    const { onEnabledToggle, onNameChange, onValueChange, onRowRemove } = useMockHeaderRow(header, onChange, onRemove);

    return (
        <div className={styles.row}>
            <Switch checked={header.enabled} label={t('mockHeaderEnabled')} isLabelHidden onChange={onEnabledToggle} />
            <input
                aria-label={t('mockHeaderName')}
                className={styles.code}
                spellCheck={false}
                value={header.name}
                required
                onChange={onNameChange}
            />
            <input
                aria-label={t('mockHeaderValue')}
                className={styles.code}
                spellCheck={false}
                value={header.value}
                onChange={onValueChange}
            />
            <Button
                aria-label={t('mockHeaderDelete')}
                size={ButtonSizes.SMALL}
                title={t('mockHeaderDelete')}
                variant={ButtonVariants.GHOST}
                isIconOnly
                onClick={onRowRemove}
            >
                <Icon name={IconNames.CLOSE} />
            </Button>
        </div>
    );
};
