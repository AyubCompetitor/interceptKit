import type { FC } from 'react';

import { SidebarSections, type SidebarSection } from '../../lib/sidebarSections.ts';
import { useSectionChoice } from '../../lib/useSectionChoice.ts';

import type { ApiRequest, CollectionLink } from '#entities/request';
import { useTranslation, type MessageKey } from '#shared/i18n';
import { SegmentedControl } from '#shared/ui';

import styles from './ApiClientSidebar.module.css';
import { CollectionPanel } from '../Collection/CollectionPanel.tsx';
import { EnvironmentPanel } from '../Environment/EnvironmentPanel.tsx';
import { HistoryPanel } from '../History/HistoryPanel.tsx';

interface ApiClientSidebarProps {
    /** Opens a copy of the request in a new tab */
    onRequestOpen: (request: ApiRequest) => void;
    /** Opens a request of a collection in a tab, or shows its tab */
    onCollectionRequestOpen: (link: CollectionLink, request: ApiRequest) => void;
}

const SIDEBAR_SECTION_LABELS: Record<SidebarSection, MessageKey> = {
    [SidebarSections.HISTORY]: 'apiClientHistory',
    [SidebarSections.COLLECTIONS]: 'apiClientCollections',
    [SidebarSections.ENVIRONMENTS]: 'apiClientEnvironments',
};

/** The history, the collections and the environments, one at a time */
export const ApiClientSidebar: FC<ApiClientSidebarProps> = ({ onRequestOpen, onCollectionRequestOpen }) => {
    const { t } = useTranslation();
    const { section, onSectionChange } = useSectionChoice<SidebarSection>(SidebarSections.HISTORY);

    const isHistory = section === SidebarSections.HISTORY;
    const isCollections = section === SidebarSections.COLLECTIONS;
    const isEnvironments = section === SidebarSections.ENVIRONMENTS;

    return (
        <aside aria-label={t('apiClientSidebar')} className={styles.sidebar}>
            <SegmentedControl
                labels={SIDEBAR_SECTION_LABELS}
                legend={t('apiClientSidebar')}
                value={section}
                isCompact
                isLegendHidden
                onChange={onSectionChange}
            />

            {isHistory && <HistoryPanel onRequestOpen={onRequestOpen} />}
            {isCollections && <CollectionPanel onRequestOpen={onCollectionRequestOpen} />}
            {isEnvironments && <EnvironmentPanel />}
        </aside>
    );
};
