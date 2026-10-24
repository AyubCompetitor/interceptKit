import { createQueue } from '#shared/lib';
import { createRouter } from '#shared/messaging';
import { restrictLocalStore } from '#shared/platform';

import { registerEnvironmentHandlers } from './environmentHandlers.ts';
import { registerHeaderRuleHandlers } from './headerRuleHandlers.ts';
import { registerMockHandlers } from './mockHandlers.ts';
import { startMockSync } from './mockSync.ts';
import { registerRuleHandlers } from './ruleHandlers.ts';
import { startRuleSync } from './ruleSync.ts';
import { registerSettingsHandlers } from './settingsHandlers.ts';
import { registerSiteHandlers } from './siteHandlers.ts';
import { migrateStorage } from './storageSchema.ts';
import { registerTransferHandlers } from './transferHandlers.ts';
import { registerVaultHandlers } from './vaultHandlers.ts';
import { startVaultLock } from './vaultKey.ts';

const FAIL_MESSAGES = {
    STORAGE_ACCESS: 'restricting storage access',
    STORAGE_MIGRATION: 'storage migration',
};

const logFailure = (task: string, error: unknown): void => {
    console.error(`[background] ${task} failed`, error);
};

export const startListenBackground: VoidFunction = () => {
    restrictLocalStore().catch((error: unknown) => logFailure(FAIL_MESSAGES.STORAGE_ACCESS, error));

    const storageReady = migrateStorage().catch((error: unknown) => logFailure(FAIL_MESSAGES.STORAGE_MIGRATION, error));

    const enqueue = createQueue();

    const router = createRouter({ extensionId: chrome.runtime.id });

    registerSettingsHandlers(router, storageReady, enqueue);
    registerRuleHandlers(router, storageReady, enqueue);
    registerMockHandlers(router, storageReady, enqueue);
    registerSiteHandlers(router, storageReady, enqueue);
    registerEnvironmentHandlers(router, storageReady, enqueue);
    registerVaultHandlers(router, storageReady, enqueue);
    registerHeaderRuleHandlers(router, enqueue);
    registerTransferHandlers(router, storageReady, enqueue);

    startRuleSync(storageReady, enqueue);
    startMockSync(storageReady, enqueue);
    startVaultLock(enqueue);

    router.listen();
};
