import { array, identifier, literal, object, optional, refine, type Validator } from '#shared/lib';

import type { CollectionLink } from './collection.ts';
import { apiRequestValidator, type ApiRequest } from './request.ts';

/** Key of the single record that keeps the open tabs */
export const OPEN_REQUESTS_KEY = 'openRequests';

export const MAX_OPEN_REQUESTS = 100;

/** A tab opened from a collection, and where its request is kept */
export interface OpenRequestLink extends CollectionLink {
    /** Id of the tab, which is the id of its request */
    readonly tabId: string;
}

/** The requests open in tabs, kept between visits to the page */
export interface OpenRequests {
    /** Key of the record */
    readonly id: typeof OPEN_REQUESTS_KEY;
    /** Requests of the tabs in their order */
    readonly requests: readonly ApiRequest[];
    /** Id of the request on the screen */
    readonly activeId: string;
    /** Tabs that came from a collection; records of older versions have none */
    readonly links?: readonly OpenRequestLink[];
}

const OPEN_REQUESTS_ERRORS = {
    UNKNOWN_ACTIVE: 'the active request is not among the open ones',
} as const;

const getActiveError = (openRequests: OpenRequests): NotRequired<string> => {
    const hasActive = openRequests.requests.some(request => request.id === openRequests.activeId);

    if (hasActive) {
        return;
    }

    return OPEN_REQUESTS_ERRORS.UNKNOWN_ACTIVE;
};

const openRequestLink = object({
    tabId: identifier,
    collectionId: identifier,
    requestId: identifier,
});

export const openRequestsValidator: Validator<OpenRequests> = refine(
    object({
        id: literal(OPEN_REQUESTS_KEY),
        requests: array(apiRequestValidator, { minLength: 1, maxLength: MAX_OPEN_REQUESTS }),
        activeId: identifier,
        links: optional(array(openRequestLink, { maxLength: MAX_OPEN_REQUESTS })),
    }),
    getActiveError,
);
