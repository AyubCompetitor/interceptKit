import { DashboardSections, type DashboardSection } from '../../lib/dashboard.ts';

import type { MessageKey } from '#shared/i18n';
import { IconNames, type IconName } from '#shared/ui';

/** A link in the sidebar */
interface NavItem {
    /** Section the link opens */
    readonly section: DashboardSection;
    /** Message key of the link text */
    readonly label: MessageKey;
    /** Icon before the text */
    readonly icon: IconName;
}

/** A section that arrives in a later version */
interface UpcomingItem {
    /** Message key of the section name */
    readonly label: MessageKey;
    /** Icon before the name */
    readonly icon: IconName;
}

/** Heading of each section, also used in the tab title */
export const SECTION_TITLES: Record<DashboardSection, MessageKey> = {
    [DashboardSections.RULES]: 'rulesTitle',
    [DashboardSections.MOCKS]: 'mocksTitle',
    [DashboardSections.SITES]: 'sitesTitle',
    [DashboardSections.SETTINGS]: 'settingsTitle',
};

export const NAV_ITEMS: readonly NavItem[] = [
    { section: DashboardSections.RULES, label: SECTION_TITLES.rules, icon: IconNames.RULES },
    { section: DashboardSections.MOCKS, label: SECTION_TITLES.mocks, icon: IconNames.MOCKS },
    { section: DashboardSections.SITES, label: SECTION_TITLES.sites, icon: IconNames.SITES },
    { section: DashboardSections.SETTINGS, label: SECTION_TITLES.settings, icon: IconNames.SETTINGS },
];

export const UPCOMING_ITEMS: readonly UpcomingItem[] = [
    { label: 'policyTitle', icon: IconNames.POLICY },
    { label: 'transferTitle', icon: IconNames.TRANSFER },
];
