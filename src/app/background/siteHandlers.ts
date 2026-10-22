import { sitesItem, sitesRpc, upsertSite, type Site } from '#entities/site';
import type { TaskQueue } from '#shared/lib';
import { RpcErrorCodes, throwRpcError, type Router } from '#shared/messaging';
import { getHostPermissions, readItem, writeItem } from '#shared/platform';

const SITE_ERRORS = {
    NOT_GRANTED: 'the browser has not granted access to this site',
} as const;

/** Settings belong to sites the user granted: a pattern the browser does not grant is refused */
const setSiteMocksHandler = async (site: Site, storageReady: Promise<void>): Promise<Site> => {
    await storageReady;

    const grantedPatterns = await getHostPermissions();

    const isGranted = grantedPatterns.includes(site.pattern);

    if (!isGranted) {
        throwRpcError(RpcErrorCodes.BAD_REQUEST, SITE_ERRORS.NOT_GRANTED);
    }

    const sites = await readItem(sitesItem);

    await writeItem(sitesItem, upsertSite(sites, site));

    return site;
};

export const registerSiteHandlers = (router: Router, storageReady: Promise<void>, enqueue: TaskQueue): void => {
    router.on(sitesRpc.setMocks, site => enqueue(() => setSiteMocksHandler(site, storageReady)));
};
