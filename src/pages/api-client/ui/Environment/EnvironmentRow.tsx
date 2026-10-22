import type { FC } from 'react';

import type { Environment } from '#entities/environment';
import { useTranslation } from '#shared/i18n';
import {
    Badge,
    Button,
    ButtonSizes,
    ButtonVariants,
    Icon,
    IconNames,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import styles from './EnvironmentRow.module.css';

interface EnvironmentRowProps {
    /** Environment shown in the row */
    environment: Environment;
    /** Whether its variables fill the requests */
    isActive: boolean;
    /** Opens the editor */
    onEdit: (environment: Environment) => void;
    /** Asks to delete the environment */
    onDelete: (environment: Environment) => void;
}

export const EnvironmentRow: FC<EnvironmentRowProps> = ({ environment, isActive, onEdit, onDelete }) => {
    const { t } = useTranslation();

    const variableCount = String(environment.variables.length);

    return (
        <li className={styles.row}>
            <div className={styles.details}>
                <div className={styles.title}>
                    <span className={styles.name}>{environment.name}</span>
                    {isActive && <Badge>{t('apiClientEnvironmentActive')}</Badge>}
                </div>

                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('apiClientEnvironmentVariableCount', variableCount)}
                </Typography>
            </div>

            <div className={styles.actions}>
                <Button
                    aria-label={t('apiClientEnvironmentEditNamed', environment.name)}
                    size={ButtonSizes.SMALL}
                    title={t('apiClientEnvironmentEdit')}
                    variant={ButtonVariants.GHOST}
                    isIconOnly
                    onClick={() => onEdit(environment)}
                >
                    <Icon name={IconNames.EDIT} />
                </Button>
                <Button
                    aria-label={t('apiClientEnvironmentDeleteNamed', environment.name)}
                    size={ButtonSizes.SMALL}
                    title={t('apiClientEnvironmentDelete')}
                    variant={ButtonVariants.GHOST}
                    isIconOnly
                    onClick={() => onDelete(environment)}
                >
                    <Icon name={IconNames.DELETE} />
                </Button>
            </div>
        </li>
    );
};
