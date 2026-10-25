import type { FC } from 'react';

import { Features, isFeatureEnabled } from '#entities/config';
import { InterceptionSwitch } from '#features/interception-switch';
import { usePolicy } from '#features/policy';
import { useTranslation } from '#shared/i18n';
import { EXTENSION_PAGES, openExtensionPage, openOptionsPage } from '#shared/platform';
import {
    Brand,
    Button,
    ButtonVariants,
    Flex,
    Spaces,
    Typography,
    TypographyColors,
    TypographySizes,
    useDocumentTitle,
} from '#shared/ui';

import styles from './PopupPage.module.css';

const onDashboardOpen = () => {
    openOptionsPage().catch(console.error);
};

const onApiClientOpen = () => {
    openExtensionPage(EXTENSION_PAGES.API_CLIENT).catch(console.error);
};

export const PopupPage: FC = () => {
    const { t } = useTranslation();
    const { policy } = usePolicy();
    const title = t('extName');

    useDocumentTitle(title);

    return (
        <Flex as='main' className={styles.popup} direction='column' gap={Spaces.L}>
            <Flex direction='column' gap={Spaces.S}>
                <h1 className={styles.title}>
                    <Brand />
                </h1>
                <Typography color={TypographyColors.HINT} size={TypographySizes.SMALL}>
                    {t('popupTagline')}
                </Typography>
            </Flex>

            <InterceptionSwitch />

            <Flex direction='column' gap={Spaces.S}>
                <Button variant={ButtonVariants.PRIMARY} isBlock onClick={onDashboardOpen}>
                    {t('popupOpenDashboard')}
                </Button>

                {isFeatureEnabled(policy, Features.API_CLIENT) && (
                    <Button isBlock onClick={onApiClientOpen}>
                        {t('popupOpenApiClient')}
                    </Button>
                )}
            </Flex>
        </Flex>
    );
};
