import type { FC } from 'react';

import { SidebarSections, type SidebarSection } from '../../lib/sidebarSections.ts';
import { useSectionChoice } from '../../lib/useSectionChoice.ts';

import type { ApiRequest } from '#entities/request';
import { useTranslation, type MessageKey } from '#shared/i18n';
import { SegmentedControl } from '#shared/ui';

import styles from './ApiClientSidebar.module.css';
import { EnvironmentPanel } from '../Environment/EnvironmentPanel.tsx';
import { HistoryPanel } from '../History/HistoryPanel.tsx';

interface ApiClientSidebarProps {
    /** Opens a copy of the request in a new tab */
    onRequestOpen: (request: ApiRequest) => void;
}

const SIDEBAR_SECTION_LABELS: Record<SidebarSection, MessageKey> = {
    [SidebarSections.HISTORY]: 'apiClientHistory',
    [SidebarSections.ENVIRONMENTS]: 'apiClientEnvironments',
};

/** The history and the environments, one at a time */
export const ApiClientSidebar: FC<ApiClientSidebarProps> = ({ onRequestOpen }) => {
    const { t } = useTranslation();
    const { section, onSectionChange } = useSectionChoice<SidebarSection>(SidebarSections.HISTORY);

    const isHistory = section === SidebarSections.HISTORY;

    return (
        <aside aria-label={t('apiClientSidebar')} className={styles.sidebar}>
            <SegmentedControl
                labels={SIDEBAR_SECTION_LABELS}
                legend={t('apiClientSidebar')}
                value={section}
                isLegendHidden
                onChange={onSectionChange}
            />

            {isHistory && <HistoryPanel onRequestOpen={onRequestOpen} />}
            {!isHistory && <EnvironmentPanel />}
        </aside>
    );
};
