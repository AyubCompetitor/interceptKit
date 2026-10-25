import { setSiteMocks, sitesItem, sitesRpc, type Site } from '#entities/site';
import { isPatternAllowed } from '#features/policy';
import type { TaskQueue } from '#shared/lib';
import { RpcErrorCodes, throwRpcError, type Router } from '#shared/messaging';
import { getHostPermissions, readItem, writeItem } from '#shared/platform';

import { readManagedPolicy } from './managedPolicy.ts';

const SITE_ERRORS = {
    NOT_GRANTED: 'the browser has not granted access to this site',
    NOT_ALLOWED: 'the policy does not allow this site',
} as const;

const setSiteMocksHandler = async (site: Site, storageReady: Promise<void>): Promise<Site> => {
    await storageReady;

    const grantedPatterns = await getHostPermissions();
    const policy = await readManagedPolicy();

    const isGranted = grantedPatterns.includes(site.pattern);

    if (!isGranted) {
        throwRpcError(RpcErrorCodes.BAD_REQUEST, SITE_ERRORS.NOT_GRANTED);
    }

    if (!isPatternAllowed(site.pattern, policy)) {
        throwRpcError(RpcErrorCodes.FORBIDDEN, SITE_ERRORS.NOT_ALLOWED);
    }

    const sites = await readItem(sitesItem);

    await writeItem(sitesItem, setSiteMocks(sites, site, grantedPatterns));

    return site;
};

export const registerSiteHandlers = (router: Router, storageReady: Promise<void>, enqueue: TaskQueue): void => {
    router.on(sitesRpc.setMocks, site => enqueue(() => setSiteMocksHandler(site, storageReady)));
};
