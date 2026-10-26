import type { FC } from 'react';

import { SendStateTypes, type SendState } from '../../model/sendState.ts';

import { API_CLIENT_CONFIG } from '#shared/config';
import { useTranslation } from '#shared/i18n';
import {
    Button,
    ButtonSizes,
    Flex,
    Icon,
    IconNames,
    Notice,
    NoticeTones,
    Spaces,
    Spinner,
    Typography,
    TypographyColors,
    TypographySizes,
} from '#shared/ui';

import styles from './ResponseContent.module.css';
import { ResponseView } from './ResponseView.tsx';

interface ResponseContentProps {
    /** Where the request of the tab stands */
    sendState: SendState;
    /** Asks for access to the host and sends the request again */
    onAccessRequest: VoidFunction;
}

const NAME_SEPARATOR = ', ';

const TIMEOUT_SECONDS = String(API_CLIENT_CONFIG.REQUEST_TIMEOUT_MS / 1000);

export const ResponseContent: FC<ResponseContentProps> = ({ sendState, onAccessRequest }) => {
    const { t } = useTranslation();

    if (sendState.stateType === SendStateTypes.RECEIVED) {
        return <ResponseView response={sendState.response} />;
    }

    if (sendState.stateType === SendStateTypes.NO_ACCESS) {
        return (
            <Notice
                action={
                    <Button size={ButtonSizes.SMALL} onClick={onAccessRequest}>
                        {t('apiClientAllowAccess')}
                    </Button>
                }
                tone={NoticeTones.WARNING}
            >
                {t('apiClientNoAccess', sendState.host)}
            </Notice>
        );
    }

    if (sendState.stateType === SendStateTypes.NOT_ALLOWED) {
        return (
            <Typography color={TypographyColors.DANGER} role='alert'>
                {t('apiClientHostNotAllowed', sendState.host)}
            </Typography>
        );
    }

    if (sendState.stateType === SendStateTypes.MISSING_VARIABLES) {
        return (
            <Typography color={TypographyColors.DANGER} role='alert'>
                {t('apiClientMissingVariables', sendState.names.join(NAME_SEPARATOR))}
            </Typography>
        );
    }

    if (sendState.stateType === SendStateTypes.SECRETS_LOCKED) {
        return (
            <Typography color={TypographyColors.DANGER} role='alert'>
                {t('apiClientSecretsLocked', sendState.names.join(NAME_SEPARATOR))}
            </Typography>
        );
    }

    if (sendState.stateType === SendStateTypes.VAULT_REQUIRED) {
        return (
            <Typography color={TypographyColors.DANGER} role='alert'>
                {t('apiClientVaultRequired', sendState.names.join(NAME_SEPARATOR))}
            </Typography>
        );
    }

    if (sendState.stateType === SendStateTypes.INVALID) {
        return (
            <Typography color={TypographyColors.DANGER} role='alert'>
                {t('apiClientInvalidRequest', sendState.reason)}
            </Typography>
        );
    }

    if (sendState.stateType === SendStateTypes.TIMED_OUT) {
        return (
            <Typography color={TypographyColors.DANGER} role='alert'>
                {t('apiClientTimedOut', TIMEOUT_SECONDS)}
            </Typography>
        );
    }

    if (sendState.stateType === SendStateTypes.FAILED) {
        return (
            <Flex direction='column' gap={Spaces.XS}>
                <Flex align='center' className={styles.failure} gap={Spaces.S} role='alert'>
                    <Icon className={styles.failureIcon} name={IconNames.ERROR} />
                    {t('apiClientSendFailed', sendState.reason)}
                </Flex>
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('apiClientSendFailedHint')}
                </Typography>
            </Flex>
        );
    }

    if (sendState.stateType === SendStateTypes.SENDING) {
        return (
            <Flex align='center' aria-label={t('apiClientResponseWaiting')} className={styles.waiting} role='status'>
                <Spinner />
            </Flex>
        );
    }

    return <Typography color={TypographyColors.HINT}>{t('apiClientResponseIdle')}</Typography>;
};
