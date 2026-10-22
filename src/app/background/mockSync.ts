import {
    Features,
    isFeatureEnabled,
    readPolicy,
    settingsItem,
    type ManagedPolicy,
    type Settings,
} from '#entities/config';
import { mapMockToPageMock, MOCK_SCRIPTS, mocksItem, type Mock, type PageMock } from '#entities/mock';
import { getGrantedSites, getMockPatterns, sitesItem, type Site } from '#entities/site';
import { Sources, Stores, type TaskQueue } from '#shared/lib';
import {
    getHostPermissions,
    readItem,
    readStoreData,
    syncContentScripts,
    watchExtensionStart,
    watchHostAccess,
    watchItem,
    watchStoreChanges,
    writeItem,
} from '#shared/platform';

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

const isMockActive = (mock: Mock, policy: ManagedPolicy): boolean => {
    /** Only an explicit false forbids user mocks: without a policy the field is absent */
    const isForbiddenUserMock = mock.source === Sources.USER && policy.allowUserRules === false;

    return mock.enabled && !isForbiddenUserMock;
};

/** Mocks need interception on, the feature allowed, an active mock and a granted site with mocks on */
export const selectMockDelivery = (state: MockState): MockDelivery => {
    const isAllowed = state.settings.enabled && isFeatureEnabled(state.policy, Features.MOCKS);

    if (!isAllowed) {
        return NO_DELIVERY;
    }

    const activeMocks = state.mocks.filter(mock => isMockActive(mock, state.policy));
    const patterns = getMockPatterns(state.sites, state.grantedPatterns);

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
    const managedData = await readStoreData(Stores.MANAGED);
    const grantedPatterns = await getHostPermissions();

    const { policy } = readPolicy(managedData);

    return {
        mocks,
        sites,
        settings,
        policy,
        grantedPatterns,
    };
};

/** Settings of a site go with its access, so granting the site again starts with mocks off */
const pruneRevokedSites = async (state: MockState): Promise<void> => {
    const grantedSites = getGrantedSites(state.sites, state.grantedPatterns);

    const isEveryGranted = grantedSites.length === state.sites.length;

    if (isEveryGranted) {
        return;
    }

    await writeItem(sitesItem, grantedSites);
};

export const syncMockScripts = async (): Promise<void> => {
    const state = await readMockState();

    await pruneRevokedSites(state);

    const { patterns } = selectMockDelivery(state);

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
