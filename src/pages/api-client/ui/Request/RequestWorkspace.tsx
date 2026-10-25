import type { FC } from 'react';

import type { RequestDraftChange } from '../../model/requestDraft.ts';
import type { RequestTab } from '../../model/requestTabs.ts';

import { useTranslation } from '#shared/i18n';
import { Typography, TypographyColors } from '#shared/ui';

import { RequestForm } from './RequestForm.tsx';
import styles from './RequestWorkspace.module.css';
import { ResponsePanel } from '../Response/ResponsePanel.tsx';
import { RequestTabBar } from '../Tabs/RequestTabBar.tsx';

interface RequestWorkspaceProps {
    /** Open requests in their order */
    tabs: readonly RequestTab[];
    /** The tab on the screen */
    activeTab: RequestTab;
    /** Tabs of a collection whose request differs from the one kept there */
    unsavedTabIds: readonly string[];
    /** Names of the requests that tabs of collections show, by the id of the tab */
    tabNames: ReadonlyMap<string, string>;
    /** Whether the request of the tab on the screen is on the way */
    isSending: boolean;
    /** Whether the last save failed */
    isSaveFailed: boolean;
    /** Opens a new empty request */
    onTabOpen: VoidFunction;
    /** Called with the id of the tab to show */
    onTabSelect: (tabId: string) => void;
    /** Called with the id of the tab to close */
    onTabClose: (tabId: string) => void;
    /** Merges changed fields into the request on the screen */
    onDraftChange: RequestDraftChange;
    /** Sends the request on the screen */
    onSend: VoidFunction;
    /** Stops the request on the screen */
    onCancel: VoidFunction;
    /** Saves the request on the screen */
    onSave: VoidFunction;
}

export const RequestWorkspace: FC<RequestWorkspaceProps> = ({
    tabs,
    activeTab,
    unsavedTabIds,
    tabNames,
    isSending,
    isSaveFailed,
    onTabOpen,
    onTabSelect,
    onTabClose,
    onDraftChange,
    onSend,
    onCancel,
    onSave,
}) => {
    const { t } = useTranslation();

    return (
        <main className={styles.workspace}>
            <RequestTabBar
                activeId={activeTab.draft.id}
                tabs={tabs}
                names={tabNames}
                unsavedIds={unsavedTabIds}
                onClose={onTabClose}
                onOpen={onTabOpen}
                onSelect={onTabSelect}
            />

            <RequestForm
                draft={activeTab.draft}
                isSending={isSending}
                onCancel={onCancel}
                onDraftChange={onDraftChange}
                onSave={onSave}
                onSend={onSend}
            />

            {isSaveFailed && (
                <Typography color={TypographyColors.DANGER} role='alert'>
                    {t('apiClientSaveFailed')}
                </Typography>
            )}

            <ResponsePanel sendState={activeTab.sendState} onAccessRequest={onSend} />
        </main>
    );
};
