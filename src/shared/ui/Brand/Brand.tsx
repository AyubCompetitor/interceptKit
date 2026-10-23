import type { FC } from 'react';

import { Icon, IconNames } from '../Icon/index.ts';

import { useTranslation } from '#shared/i18n';

import styles from './Brand.module.css';

export const Brand: FC = () => {
    const { t } = useTranslation();

    return (
        <span className={styles.brand}>
            <span className={styles.mark}>
                <Icon name={IconNames.BRAND} />
            </span>
            {t('extName')}
        </span>
    );
};
