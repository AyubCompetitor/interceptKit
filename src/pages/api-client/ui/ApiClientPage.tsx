import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Flex, Spaces, useDocumentTitle } from '#shared/ui';

import styles from './ApiClientPage.module.css';

export const ApiClientPage: FC = () => {
    const { t } = useTranslation();

    useDocumentTitle(`${t('apiClientTitle')}: ${t('extName')}`);

    return (
        <Flex as='main' className={styles.apiClient} direction='column' gap={Spaces.XS}>
            <h1>{t('apiClientTitle')}</h1>
            <p className={styles.placeholder}>{t('apiClientPlaceholder')}</p>
        </Flex>
    );
};
