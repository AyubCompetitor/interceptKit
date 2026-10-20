import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { createDocumentTitle, Flex, Spaces, Typography, TypographyColors, useDocumentTitle } from '#shared/ui';

import styles from './ApiClientPage.module.css';

export const ApiClientPage: FC = () => {
    const { t } = useTranslation();
    const title = createDocumentTitle('apiClientTitle', 'extName', t);

    useDocumentTitle(title);

    return (
        <Flex as='main' className={styles.apiClient} direction='column' gap={Spaces.XS}>
            <h1>{t('apiClientTitle')}</h1>

            <Typography color={TypographyColors.HINT}>{t('apiClientPlaceholder')}</Typography>
        </Flex>
    );
};
