import type { FC } from 'react';

import { ALL_SITES_PATTERN, formatHostPattern, parseHostPattern } from '#entities/site';
import { useTranslation } from '#shared/i18n';
import { Badge } from '#shared/ui';

import styles from './SiteName.module.css';

interface SiteNameProps {
    /** Granted host pattern */
    pattern: string;
}

export const SiteName: FC<SiteNameProps> = ({ pattern }) => {
    const { t } = useTranslation();

    const grant = parseHostPattern(pattern);

    if (pattern === ALL_SITES_PATTERN) {
        return <span className={styles.name}>{t('sitesAllSites')}</span>;
    }

    if (grant === undefined) {
        return <code className={styles.name}>{formatHostPattern(pattern)}</code>;
    }

    return (
        <span className={styles.name}>
            {grant.host}
            {grant.isWithSubdomains && <Badge>{t('sitesWithSubdomains')}</Badge>}
        </span>
    );
};
