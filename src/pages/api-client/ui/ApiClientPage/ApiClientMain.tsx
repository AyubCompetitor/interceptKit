import type { FC } from 'react';

import { useSaveShortcut } from '../../lib/useSaveShortcut.ts';
import { useApiClient } from '../../model/useApiClient.ts';

import { useTranslation } from '#shared/i18n';
import { Brand } from '#shared/ui';

import styles from './ApiClientMain.module.css';
import { SaveRequestModal } from '../Collection/SaveRequestModal.tsx';
import { CurlImportControl } from '../Curl/CurlImportControl.tsx';
import { EnvironmentSelect } from '../Environment/EnvironmentSelect.tsx';
import { RequestWorkspace } from '../Request/RequestWorkspace.tsx';
import { ApiClientSidebar } from '../Sidebar/ApiClientSidebar.tsx';
import { formatRequestUrl } from '../Tabs/requestTabTitle.ts';
import { VaultControl } from '../Vault/VaultControl.tsx';

/** The tabs live here: the history and the collections in the sidebar and the cURL import in the header open requests in them */
export const ApiClientMain: FC = () => {
    const { t } = useTranslation();

    const {
        tabs,
        activeTab,
        collections,
        unsavedTabIds,
        tabNames,
        isSending,
        isLimitReached,
        isSaveDialogOpen,
        isSaveFailed,
        onTabOpen,
        onRequestOpen,
        onCurlImport,
        onCollectionRequestOpen,
        onTabSelect,
        onRequestTabClose,
        onDraftChange,
        onActiveRequestSend,
        onActiveRequestCancel,
        onActiveTabSave,
        onSaveAs,
        onSaveDialogClose,
    } = useApiClient();

    useSaveShortcut(onActiveTabSave);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <Brand />
                <h1 className={styles.title}>{t('apiClientTitle')}</h1>
                <div className={styles.tools}>
                    <CurlImportControl onImport={onCurlImport} />

                    <VaultControl />

                    <EnvironmentSelect />
                </div>
            </header>

            <div className={styles.layout}>
                <ApiClientSidebar onCollectionRequestOpen={onCollectionRequestOpen} onRequestOpen={onRequestOpen} />

                {activeTab && (
                    <RequestWorkspace
                        activeTab={activeTab}
                        isSaveFailed={isSaveFailed}
                        isSending={isSending}
                        tabNames={tabNames}
                        tabs={tabs}
                        unsavedTabIds={unsavedTabIds}
                        onCancel={onActiveRequestCancel}
                        onDraftChange={onDraftChange}
                        onSave={onActiveTabSave}
                        onSend={onActiveRequestSend}
                        onTabClose={onRequestTabClose}
                        onTabOpen={onTabOpen}
                        onTabSelect={onTabSelect}
                    />
                )}
            </div>

            {isSaveDialogOpen && activeTab && (
                <SaveRequestModal
                    collections={collections}
                    defaultName={formatRequestUrl(activeTab.draft.url) ?? t('apiClientCollectionNewRequest')}
                    isLimitReached={isLimitReached}
                    isSaveFailed={isSaveFailed}
                    onClose={onSaveDialogClose}
                    onSave={onSaveAs}
                />
            )}
        </div>
    );
};
