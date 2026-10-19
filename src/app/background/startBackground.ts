import { createQueue } from '#shared/lib';
import { createRouter } from '#shared/messaging';
import { restrictLocalStorageToExtension } from '#shared/platform';

import { registerSettingsHandlers } from './settingsHandlers.ts';
import { migrateStorage } from './storageSchema.ts';

const logFailure = (task: string) => (error: unknown) => {
    console.error(`[background] ${task} failed`, error);
};

export const startBackground: VoidFunction = () => {
    restrictLocalStorageToExtension().catch(logFailure('restricting storage access'));

    const storageReady = migrateStorage().catch(logFailure('storage migration'));

    const router = createRouter({ extensionId: chrome.runtime.id });

    registerSettingsHandlers(router, storageReady, createQueue());

    router.listen();
};
