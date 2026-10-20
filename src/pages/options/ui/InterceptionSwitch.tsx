import type { FC } from 'react';

import { useInterceptionSwitch } from '../model/useInterceptionSwitch.ts';

import { useTranslation } from '#shared/i18n';
import { Checkbox, Flex, Spaces, Typography, TypographyColors } from '#shared/ui';

export const InterceptionSwitch: FC = () => {
    const { t } = useTranslation();
    const { isEnabled, isSaveFailed, onEnabledChange } = useInterceptionSwitch();

    return (
        <Flex align='end' direction='column' gap={Spaces.XS}>
            <Checkbox checked={isEnabled} label={t('interceptionEnabled')} onChange={onEnabledChange} />
            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('interceptionSaveFailed')}
                </Typography>
            )}
        </Flex>
    );
};
