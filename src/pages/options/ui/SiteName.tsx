import type { FC } from 'react';

import { ALL_SITES_PATTERN, formatHostPattern } from '#entities/site';
import { useTranslation } from '#shared/i18n';

interface SiteNameProps {
    /** Granted host pattern */
    pattern: string;
}

export const SiteName: FC<SiteNameProps> = ({ pattern }) => {
    const { t } = useTranslation();

    if (pattern === ALL_SITES_PATTERN) {
        return <span>{t('sitesAllSites')}</span>;
    }

    return <code>{formatHostPattern(pattern)}</code>;
};
