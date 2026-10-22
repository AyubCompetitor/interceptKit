import type { FC } from 'react';

import { useRequestDraftFields } from '../../lib/useRequestDraftFields.ts';
import type { RequestDraftFields } from '../../model/requestDraft.ts';

import { useTranslation } from '#shared/i18n';
import { Flex, Spaces, Switch, Typography, TypographyColors, TypographySizes } from '#shared/ui';

/** Cookies stay off by default: a request from the extension would otherwise carry the user's session */
export const RequestSettingsFields: FC<RequestDraftFields> = ({ draft, onDraftChange }) => {
    const { t } = useTranslation();
    const { onSendCookiesToggle } = useRequestDraftFields(draft, onDraftChange);

    return (
        <Flex direction='column' gap={Spaces.S}>
            <Switch checked={draft.sendCookies} label={t('apiClientSendCookies')} onChange={onSendCookiesToggle} />

            <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                {t('apiClientSendCookiesHint')}
            </Typography>
        </Flex>
    );
};
