import type { FC } from 'react';

import type { RequestDraftChange } from '../../model/requestDraft.ts';
import type { RequestTab } from '../../model/requestTabs.ts';

import { RequestForm } from './RequestForm.tsx';
import styles from './RequestWorkspace.module.css';
import { ResponsePanel } from '../Response/ResponsePanel.tsx';
import { RequestTabBar } from '../Tabs/RequestTabBar.tsx';

interface RequestWorkspaceProps {
    /** Open requests in their order */
    tabs: readonly RequestTab[];
    /** The tab on the screen */
    activeTab: RequestTab;
    /** Whether the request of the tab on the screen is on the way */
    isSending: boolean;
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
}

export const RequestWorkspace: FC<RequestWorkspaceProps> = ({
    tabs,
    activeTab,
    isSending,
    onTabOpen,
    onTabSelect,
    onTabClose,
    onDraftChange,
    onSend,
    onCancel,
}) => (
    <main className={styles.workspace}>
        <RequestTabBar
            activeId={activeTab.draft.id}
            tabs={tabs}
            onClose={onTabClose}
            onOpen={onTabOpen}
            onSelect={onTabSelect}
        />

        <RequestForm
            draft={activeTab.draft}
            isSending={isSending}
            onCancel={onCancel}
            onDraftChange={onDraftChange}
            onSend={onSend}
        />

        <ResponsePanel sendState={activeTab.sendState} onAccessRequest={onSend} />
    </main>
);
