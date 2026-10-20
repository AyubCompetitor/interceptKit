import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { EXTENSION_PAGES, openExtensionPage, openOptionsPage } from '#shared/platform';
import { Button, ButtonVariants, Flex, Spaces, Typography, TypographyColors, useDocumentTitle } from '#shared/ui';

import styles from './PopupPage.module.css';

const logError = (error: unknown): void => {
    console.error(error);
};

const openDashboard = (): void => {
    openOptionsPage().catch(logError);
};

const openApiClient = (): void => {
    openExtensionPage(EXTENSION_PAGES.API_CLIENT).catch(logError);
};

export const PopupPage: FC = () => {
    const { t } = useTranslation();
    const title = t('extName');

    useDocumentTitle(title);

    return (
        <Flex as='main' className={styles.popup} direction='column' gap={Spaces.L}>
            <Flex direction='column' gap={Spaces.XS}>
                <h1>{title}</h1>
                <Typography color={TypographyColors.HINT}>{t('popupTagline')}</Typography>
            </Flex>

            <Flex direction='column' gap={Spaces.S}>
                <Button variant={ButtonVariants.PRIMARY} onClick={openDashboard}>
                    {t('popupOpenDashboard')}
                </Button>

                <Button onClick={openApiClient}>{t('popupOpenApiClient')}</Button>
            </Flex>
        </Flex>
    );
};
