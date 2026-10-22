import type { FC } from 'react';

import { useApiClient } from '../../model/useApiClient.ts';

import { useTranslation } from '#shared/i18n';
import { Brand, createDocumentTitle, useDocumentTitle } from '#shared/ui';

import styles from './ApiClientPage.module.css';
import { RequestForm } from '../Request/RequestForm.tsx';
import { ResponsePanel } from '../Response/ResponsePanel.tsx';
import { RequestTabBar } from '../Tabs/RequestTabBar.tsx';

export const ApiClientPage: FC = () => {
    const { t } = useTranslation();
    const {
        tabs,
        activeTab,
        isSending,
        onTabOpen,
        onTabSelect,
        onRequestTabClose,
        onDraftChange,
        onActiveRequestSend,
        onActiveRequestCancel,
    } = useApiClient();
    const title = createDocumentTitle('apiClientTitle', 'extName', t);

    useDocumentTitle(title);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Brand />
                <h1 className={styles.title}>{t('apiClientTitle')}</h1>
            </header>

            <main className={styles.content}>
                <RequestTabBar
                    activeId={activeTab.draft.id}
                    tabs={tabs}
                    onClose={onRequestTabClose}
                    onOpen={onTabOpen}
                    onSelect={onTabSelect}
                />

                <RequestForm
                    draft={activeTab.draft}
                    isSending={isSending}
                    onCancel={onActiveRequestCancel}
                    onDraftChange={onDraftChange}
                    onSend={onActiveRequestSend}
                />

                <ResponsePanel sendState={activeTab.sendState} onAccessRequest={onActiveRequestSend} />
            </main>
        </div>
    );
};
