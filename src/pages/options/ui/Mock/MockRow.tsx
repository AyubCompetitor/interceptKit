import type { FC } from 'react';

import type { Mock } from '#entities/mock';
import { useTranslation } from '#shared/i18n';
import {
    Badge,
    Button,
    ButtonSizes,
    ButtonVariants,
    Icon,
    IconNames,
    joinClassNames,
    Switch,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import styles from './MockRow.module.css';
import { getMockSummary } from './mockSummary.ts';

interface MockRowProps {
    /** Mock shown in the row */
    mock: Mock;
    /** Called when the mock is switched on or off */
    onToggle: (mock: Mock) => void;
    /** Opens the editor */
    onEdit: (mock: Mock) => void;
    /** Asks to delete the mock */
    onDelete: (mock: Mock) => void;
}

export const MockRow: FC<MockRowProps> = ({ mock, onToggle, onEdit, onDelete }) => {
    const { t } = useTranslation();

    const summary = getMockSummary(mock, t);
    const hasSummary = summary !== undefined;

    return (
        <li className={joinClassNames(styles.row, !mock.enabled && styles.isDisabled)}>
            <Switch checked={mock.enabled} label={mock.name} isLabelHidden onChange={() => onToggle(mock)} />

            <div className={styles.details}>
                <div className={styles.title}>
                    <span className={styles.name}>{mock.name}</span>
                    <Badge>{mock.response.status}</Badge>
                </div>

                <code className={styles.pattern}>{mock.match.url.value}</code>

                {hasSummary && (
                    <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                        {summary}
                    </Typography>
                )}
            </div>

            <div className={styles.actions}>
                <Button
                    aria-label={t('mocksEdit')}
                    size={ButtonSizes.SMALL}
                    title={t('mocksEdit')}
                    variant={ButtonVariants.GHOST}
                    isIconOnly
                    onClick={() => onEdit(mock)}
                >
                    <Icon name={IconNames.EDIT} />
                </Button>
                <Button
                    aria-label={t('mocksDelete')}
                    size={ButtonSizes.SMALL}
                    title={t('mocksDelete')}
                    variant={ButtonVariants.GHOST}
                    isIconOnly
                    onClick={() => onDelete(mock)}
                >
                    <Icon name={IconNames.DELETE} />
                </Button>
            </div>
        </li>
    );
};
