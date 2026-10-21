import type { FC } from 'react';

import { useThemeSettings } from '../../model/useThemeSettings.ts';

import { useTranslation } from '#shared/i18n';
import { Flex, Spaces, Typography, TypographyColors } from '#shared/ui';

import { SegmentedControl } from '../SegmentedControl/SegmentedControl.tsx';

import { THEME_LABELS } from './themeLabels.ts';

export const ThemeSettings: FC = () => {
    const { t } = useTranslation();
    const { theme, isSaveFailed, onThemeChange } = useThemeSettings();

    return (
        <Flex direction='column' gap={Spaces.S}>
            <SegmentedControl
                labels={THEME_LABELS}
                legend={t('settingsTheme')}
                value={theme}
                onChange={onThemeChange}
            />

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('settingsSaveFailed')}
                </Typography>
            )}
        </Flex>
    );
};
