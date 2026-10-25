import { Features, isFeatureEnabled, settingsItem, type ManagedPolicy, type Settings } from '#entities/config';
import { mapMockToPageMock, MOCK_SCRIPTS, mocksItem, type Mock, type PageMock } from '#entities/mock';
import { getMockPatterns, sitesItem, type Site } from '#entities/site';
import { isMockAllowed, isPatternAllowed } from '#features/policy';
import { Stores, type TaskQueue } from '#shared/lib';
import {
    getHostPermissions,
    readItem,
    syncContentScripts,
    watchExtensionStart,
    watchHostAccess,
    watchItem,
    watchStoreChanges,
} from '#shared/platform';

import { readManagedPolicy } from './managedPolicy.ts';

/** Everything that decides which pages get which mocks */
export interface MockState {
    /** Stored mocks */
    readonly mocks: readonly Mock[];
    /** Stored settings of sites */
    readonly sites: readonly Site[];
    /** User settings */
    readonly settings: Settings;
    /** Administrator policy */
    readonly policy: ManagedPolicy;
    /** Host patterns the browser grants */
    readonly grantedPatterns: readonly string[];
}

/** Which pages get mocks, and which mocks they get */
export interface MockDelivery {
    /** Host patterns the mock scripts are registered on; none when there is nothing to serve */
    readonly patterns: readonly string[];
    /** Mocks for those pages, in priority order */
    readonly mocks: readonly PageMock[];
}

const NO_DELIVERY: MockDelivery = {
    patterns: [],
    mocks: [],
};

const isMockActive = (mock: Mock, policy: ManagedPolicy): boolean => mock.enabled && isMockAllowed(mock, policy);

/** Mocks need interception on, the feature allowed, an active mock and a granted site with mocks on that the policy allows */
export const selectMockDelivery = (state: MockState): MockDelivery => {
    const isAllowed = state.settings.enabled && isFeatureEnabled(state.policy, Features.MOCKS);

    if (!isAllowed) {
        return NO_DELIVERY;
    }

    const activeMocks = state.mocks.filter(mock => isMockActive(mock, state.policy));
    const mockPatterns = getMockPatterns(state.sites, state.grantedPatterns);
    const patterns = mockPatterns.filter(pattern => isPatternAllowed(pattern, state.policy));

    const hasNothingToServe = activeMocks.length === 0 || patterns.length === 0;

    if (hasNothingToServe) {
        return NO_DELIVERY;
    }

    return {
        patterns,
        mocks: activeMocks.map(mapMockToPageMock),
    };
};

export const readMockState = async (): Promise<MockState> => {
    const mocks = await readItem(mocksItem);
    const sites = await readItem(sitesItem);
    const settings = await readItem(settingsItem);
    const policy = await readManagedPolicy();
    const grantedPatterns = await getHostPermissions();

    return {
        mocks,
        sites,
        settings,
        policy,
        grantedPatterns,
    };
};

export const syncMockScripts = async (): Promise<void> => {
    const { patterns } = selectMockDelivery(await readMockState());

    await syncContentScripts(MOCK_SCRIPTS, patterns);
};

export const startMockSync = (storageReady: Promise<void>, enqueue: TaskQueue): void => {
    const requestSync: VoidFunction = () => {
        enqueue(async () => {
            await storageReady;
            await syncMockScripts();
        }).catch((error: unknown) => console.error('[mocks] sync failed', error));
    };

    watchItem(mocksItem, requestSync);
    watchItem(sitesItem, requestSync);
    watchItem(settingsItem, requestSync);
    watchStoreChanges(Stores.MANAGED, requestSync);
    watchHostAccess(requestSync);

    watchExtensionStart(requestSync);
};
