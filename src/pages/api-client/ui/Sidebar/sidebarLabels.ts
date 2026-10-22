import { SidebarSections, type SidebarSection } from '../../lib/sidebarSections.ts';

import type { MessageKey } from '#shared/i18n';

/** Parts of the sidebar; the key order is the order of the options */
export const SIDEBAR_SECTION_LABELS: Record<SidebarSection, MessageKey> = {
    [SidebarSections.HISTORY]: 'apiClientHistory',
    [SidebarSections.ENVIRONMENTS]: 'apiClientEnvironments',
};
