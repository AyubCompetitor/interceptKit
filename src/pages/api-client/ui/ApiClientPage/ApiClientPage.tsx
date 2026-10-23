import type { FC } from 'react';

import { useApiClient } from '../../model/useApiClient.ts';

import { useTranslation } from '#shared/i18n';
import { Brand, createDocumentTitle, useDocumentTitle } from '#shared/ui';

import styles from './ApiClientPage.module.css';
import { CurlImportControl } from '../Curl/CurlImportControl.tsx';
import { EnvironmentSelect } from '../Environment/EnvironmentSelect.tsx';
import { RequestWorkspace } from '../Request/RequestWorkspace.tsx';
import { ApiClientSidebar } from '../Sidebar/ApiClientSidebar.tsx';
import { VaultControl } from '../Vault/VaultControl.tsx';

/** The tabs live here: the history in the sidebar and the cURL import in the header open requests in them */
export const ApiClientPage: FC = () => {
    const { t } = useTranslation();

    const {
        tabs,
        activeTab,
        isSending,
        onTabOpen,
        onRequestOpen,
        onCurlImport,
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
                <div className={styles.tools}>
                    <CurlImportControl onImport={onCurlImport} />

                    <VaultControl />

                    <EnvironmentSelect />
                </div>
            </header>

            <div className={styles.layout}>
                <ApiClientSidebar onRequestOpen={onRequestOpen} />

                {activeTab && (
                    <RequestWorkspace
                        activeTab={activeTab}
                        isSending={isSending}
                        tabs={tabs}
                        onCancel={onActiveRequestCancel}
                        onDraftChange={onDraftChange}
                        onSend={onActiveRequestSend}
                        onTabClose={onRequestTabClose}
                        onTabOpen={onTabOpen}
                        onTabSelect={onTabSelect}
                    />
                )}
            </div>
        </div>
    );
};
