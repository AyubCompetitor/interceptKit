import type { KeyValue } from '#shared/lib';

import type { ApiRequest } from './request.ts';
import { appendRawQuery, encodeQueryPair, parseRawQuery } from './urlQuery.ts';

/** Version of the API client database from which the URL holds the query and the table only mirrors it */
export const QUERY_IN_URL_VERSION = 2;

/** The parameters an older client added to the URL at sending */
const isAddedPair = (pair: KeyValue): boolean => pair.enabled && pair.key.trim() !== '';

const joinAddedPairs = (request: ApiRequest): string => {
    const addedParts: string[] = [];

    for (const pair of request.query) {
        if (!isAddedPair(pair)) {
            continue;
        }

        addedParts.push(encodeQueryPair(pair));
    }

    if (addedParts.length === 0) {
        return request.url;
    }

    return appendRawQuery(request.url, addedParts);
};

/** A request saved before the URL held its query: its parameters join the URL once, encoded the way they went */
export const upgradeRequestQuery = (request: ApiRequest): ApiRequest => {
    const url = joinAddedPairs(request);
    const disabledPairs = request.query.filter(pair => !pair.enabled);

    return {
        ...request,
        url,
        query: [...parseRawQuery(url), ...disabledPairs],
    };
};
