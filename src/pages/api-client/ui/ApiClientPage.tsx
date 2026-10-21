import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Brand, createDocumentTitle, EmptyState, Flex, IconNames, Spaces, useDocumentTitle } from '#shared/ui';

import styles from './ApiClientPage.module.css';

export const ApiClientPage: FC = () => {
    const { t } = useTranslation();
    const title = createDocumentTitle('apiClientTitle', 'extName', t);

    useDocumentTitle(title);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Brand />
            </header>

            <Flex as='main' className={styles.content} direction='column' gap={Spaces.XL}>
                <h1>{t('apiClientTitle')}</h1>

                <EmptyState
                    description={t('apiClientPlaceholder')}
                    icon={IconNames.API_CLIENT}
                    title={t('apiClientSoonTitle')}
                />
            </Flex>
        </div>
    );
};
