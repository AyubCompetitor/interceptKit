import type { FC } from 'react';

import { useInterceptionSwitch } from '../model/useInterceptionSwitch.ts';

import { useTranslation } from '#shared/i18n';
import { Switch, Typography, TypographyColors, TypographySizes } from '#shared/ui';

import styles from './InterceptionSwitch.module.css';

/** The master switch of all rules, with a line on what it means right now */
export const InterceptionSwitch: FC = () => {
    const { t } = useTranslation();
    const { isEnabled, isSaveFailed, onEnabledChange } = useInterceptionSwitch();

    return (
        <div className={styles.card}>
            <Switch
                checked={isEnabled}
                className={styles.switch}
                label={t('interceptionLabel')}
                onChange={onEnabledChange}
            />

            <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {isEnabled ? t('interceptionOn') : t('interceptionOff')}
            </Typography>

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert' size={TypographySizes.SMALL}>
                    {t('interceptionSaveFailed')}
                </Typography>
            )}
        </div>
    );
};
