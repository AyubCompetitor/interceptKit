import type { FC } from 'react';

import { buildSectionHash, type DashboardSection } from '../../lib/dashboard.ts';

import { Features, isFeatureEnabled } from '#entities/config';
import { InterceptionSwitch } from '#features/interception-switch';
import { usePolicy } from '#features/policy';
import { useTranslation } from '#shared/i18n';
import { EXTENSION_PAGES } from '#shared/platform';
import { Brand, Icon, IconNames } from '#shared/ui';

import { NAV_ITEMS } from './dashboardNav.ts';
import styles from './Sidebar.module.css';

interface SidebarProps {
    /** Section on the screen */
    section: DashboardSection;
}

const API_CLIENT_URL = `/${EXTENSION_PAGES.API_CLIENT}`;

export const Sidebar: FC<SidebarProps> = ({ section }) => {
    const { t } = useTranslation();
    const { policy } = usePolicy();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.brand}>
                <Brand />
            </div>

            <InterceptionSwitch />

            <nav aria-label={t('navLabel')} className={styles.nav}>
                <ul className={styles.list}>
                    {NAV_ITEMS.map(item => (
                        <li key={item.section}>
                            <a
                                aria-current={item.section === section && 'page'}
                                className={styles.link}
                                href={buildSectionHash(item.section)}
                            >
                                <Icon name={item.icon} />
                                {t(item.label)}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            {isFeatureEnabled(policy, Features.API_CLIENT) && (
                <a className={styles.link} href={API_CLIENT_URL} rel='noreferrer' target='_blank'>
                    <Icon name={IconNames.API_CLIENT} />
                    {t('apiClientTitle')}
                </a>
            )}
        </aside>
    );
};
