import type { FC } from 'react';

import { SendStateTypes, type SendState } from '../../model/sendState.ts';

import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonSizes,
    Flex,
    Notice,
    NoticeTones,
    Spaces,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import { ResponseView } from './ResponseView.tsx';

interface ResponseContentProps {
    /** Where the request of the tab stands */
    sendState: SendState;
    /** Asks for access to the host and sends the request again */
    onAccessRequest: VoidFunction;
}

/** What the panel shows for each stage of sending */
export const ResponseContent: FC<ResponseContentProps> = ({ sendState, onAccessRequest }) => {
    const { t } = useTranslation();

    if (sendState.stateType === SendStateTypes.RECEIVED) {
        return <ResponseView response={sendState.response} />;
    }

    if (sendState.stateType === SendStateTypes.NO_ACCESS) {
        const accessButton = (
            <Button size={ButtonSizes.SMALL} onClick={onAccessRequest}>
                {t('apiClientAllowAccess')}
            </Button>
        );

        return (
            <Notice action={accessButton} tone={NoticeTones.WARNING}>
                {t('apiClientNoAccess', sendState.host)}
            </Notice>
        );
    }

    if (sendState.stateType === SendStateTypes.INVALID) {
        return (
            <Typography color={TypographyColors.DANGER} role='alert'>
                {t('apiClientInvalidRequest', sendState.reason)}
            </Typography>
        );
    }

    if (sendState.stateType === SendStateTypes.FAILED) {
        return (
            <Flex direction='column' gap={Spaces.XS}>
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientSendFailed', sendState.reason)}
                </Typography>
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('apiClientSendFailedHint')}
                </Typography>
            </Flex>
        );
    }

    if (sendState.stateType === SendStateTypes.SENDING) {
        return (
            <Typography color={TypographyColors.HINT} role='status'>
                {t('apiClientResponseWaiting')}
            </Typography>
        );
    }

    return <Typography color={TypographyColors.HINT}>{t('apiClientResponseIdle')}</Typography>;
};
