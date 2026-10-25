import { getDisallowedPatterns } from '#features/policy';
import { Stores, type TaskQueue } from '#shared/lib';
import {
    getHostPermissions,
    revokeHostAccess,
    watchExtensionStart,
    watchHostAccess,
    watchStoreChanges,
} from '#shared/platform';

import { readManagedPolicy } from './managedPolicy.ts';

const REVOKE_ERRORS = {
    KEPT: 'the browser kept access to hosts outside allowedHosts',
} as const;

const isRejected = (outcome: PromiseSettledResult<boolean>): outcome is PromiseRejectedResult =>
    outcome.status === 'rejected';

export const revokeDisallowedHosts = async (): Promise<void> => {
    const policy = await readManagedPolicy();
    const grantedPatterns = await getHostPermissions();

    const disallowedPatterns = getDisallowedPatterns(grantedPatterns, policy);

    const outcomes = await Promise.allSettled(disallowedPatterns.map(revokeHostAccess));
    const failures = outcomes.filter(isRejected);

    if (!failures.length) {
        return;
    }

    throw new AggregateError(
        failures.map(failure => failure.reason),
        REVOKE_ERRORS.KEPT,
    );
};

export const startHostAccessSync = (enqueue: TaskQueue): void => {
    const requestSync: VoidFunction = () => {
        enqueue(revokeDisallowedHosts).catch((error: unknown) => console.error('[hosts] sync failed', error));
    };

    watchStoreChanges(Stores.MANAGED, requestSync);
    watchHostAccess(requestSync);

    watchExtensionStart(requestSync);
};
