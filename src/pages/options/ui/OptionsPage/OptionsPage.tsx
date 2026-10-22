import type { FC } from 'react';

import { DashboardSections } from '../../lib/dashboard.ts';
import { useDashboardSection } from '../../lib/useDashboardSection.ts';

import { useTranslation } from '#shared/i18n';
import { createDocumentTitle, useDocumentTitle } from '#shared/ui';

import { MocksSection } from '../Mock/MocksSection.tsx';
import styles from './OptionsPage.module.css';
import { RulesSection } from '../Rule/RulesSection.tsx';
import { SettingsSection } from '../SettingsSection/SettingsSection.tsx';
import { SECTION_TITLES } from '../Sidebar/dashboardNav.ts';
import { Sidebar } from '../Sidebar/Sidebar.tsx';
import { SitesSection } from '../Site/SitesSection.tsx';

export const OptionsPage: FC = () => {
    const { t } = useTranslation();
    const { section } = useDashboardSection();
    const title = createDocumentTitle('extName', SECTION_TITLES[section], t);

    useDocumentTitle(title);

    const isRules = section === DashboardSections.RULES;
    const isMocks = section === DashboardSections.MOCKS;
    const isSites = section === DashboardSections.SITES;
    const isSettings = section === DashboardSections.SETTINGS;

    return (
        <div className={styles.layout}>
            <Sidebar section={section} />

            <main className={styles.content}>
                {isRules && <RulesSection />}
                {isMocks && <MocksSection />}
                {isSites && <SitesSection />}
                {isSettings && <SettingsSection />}
            </main>
        </div>
    );
};
