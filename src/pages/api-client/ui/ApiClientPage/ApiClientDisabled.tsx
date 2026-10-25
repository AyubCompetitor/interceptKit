import type { FC } from 'react';

import { useTranslation } from '#shared/i18n';
import { Brand, EmptyState, IconNames } from '#shared/ui';

import styles from './ApiClientDisabled.module.css';

export const ApiClientDisabled: FC = () => {
    const { t } = useTranslation();

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Brand />
                <h1 className={styles.title}>{t('apiClientTitle')}</h1>
            </header>

            <main className={styles.content}>
                <EmptyState
                    description={t('apiClientDisabledText')}
                    icon={IconNames.API_CLIENT}
                    title={t('apiClientDisabledTitle')}
                />
            </main>
        </div>
    );
};
