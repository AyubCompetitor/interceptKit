import type { HttpMethod } from '#shared/lib';

import type { HeaderOperation, ResourceType } from './rule.ts';

export enum DnrTypes {
    REDIRECT = 'redirect',
    MODIFY_HEADERS = 'modifyHeaders',
    BLOCK = 'block',
}

/** Lowercase method names, the form DNR conditions use */
export type DnrRequestMethod = Lowercase<HttpMethod>;

/** Shape of chrome.declarativeNetRequest.RuleCondition; the compiler fills it step by step */
export interface DnrCondition {
    /** urlFilter syntax: ||, ^, |, * */
    urlFilter?: string;
    /** RE2 regular expression */
    regexFilter?: string;
    /** Only requests with these methods */
    requestMethods?: DnrRequestMethod[];
    /** Only requests of these resource types */
    resourceTypes?: ResourceType[];
    /** Only requests started by pages on these domains, subdomains included */
    initiatorDomains?: string[];
}

export interface DnrHeaderInfo {
    /** Header name, lowercase */
    header: string;
    /** What happens to the header */
    operation: HeaderOperation;
    /** Required for set and append */
    value?: string;
}

export interface DnrUrlTransform {
    /** New scheme */
    scheme?: string;
    /** New host */
    host?: string;
    /** New port */
    port?: string;
    /** New path */
    path?: string;
}

/** Shape of chrome.declarativeNetRequest.Redirect: the browser rejects any field it does not know */
export interface DnrRedirect {
    /** Absolute target URL */
    url?: string;
    /** Target with the \1…\9 capture groups of regexFilter */
    regexSubstitution?: string;
    /** Changes to parts of the original URL */
    transform?: DnrUrlTransform;
}

export interface DnrBlockAction {
    /** Action type */
    type: DnrTypes.BLOCK;
}

export interface DnrRedirectAction {
    /** Action type */
    type: DnrTypes.REDIRECT;
    /** Where the request goes instead */
    redirect: DnrRedirect;
}

export interface DnrModifyHeadersAction {
    /** Action type */
    type: DnrTypes.MODIFY_HEADERS;
    /** Changes to request headers; omitted when there are none */
    requestHeaders?: DnrHeaderInfo[];
    /** Changes to response headers; omitted when there are none */
    responseHeaders?: DnrHeaderInfo[];
}

export type DnrAction = DnrBlockAction | DnrRedirectAction | DnrModifyHeadersAction;

/** Shape of chrome.declarativeNetRequest.Rule */
export interface DnrRule {
    /** Positive integer, unique among dynamic rules */
    id: number;
    /** Higher wins; always explicit, because equal priorities have no defined order */
    priority: number;
    /** What happens to a matching request */
    action: DnrAction;
    /** Which requests match */
    condition: DnrCondition;
}
