import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { EXTENSION_PAGES, openExtensionPage, openOptionsPage } from '#shared/platform';
import { Button, ButtonVariants, Flex, Spaces, useDocumentTitle } from '#shared/ui';

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

    useDocumentTitle(t('extName'));

    return (
        <Flex as='main' className={styles.popup} direction='column' gap={Spaces.L}>
            <Flex direction='column' gap={Spaces.XS}>
                <h1>{t('extName')}</h1>
                <p className={styles.tagline}>{t('popupTagline')}</p>
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
