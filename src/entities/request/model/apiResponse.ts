import type { HeaderEntry } from './outgoingRequest.ts';

/** What came back for a request of the API client */
export interface ApiResponse {
    /** HTTP status code */
    readonly status: number;
    /** Reason phrase; empty over HTTP/2 and later */
    readonly statusText: string;
    /** Headers the browser lets a page read: never Set-Cookie */
    readonly headers: readonly HeaderEntry[];

    /** Body decoded as UTF-8 */
    readonly body: string;
    /** Size of the body in bytes, after the browser decompressed it */
    readonly size: number;
    /** Milliseconds from sending to the end of the body */
    readonly durationMs: number;
}

const CONTENT_TYPE_HEADER = 'content-type';

/** Statuses from 400 on are errors of the client or the server */
const FIRST_ERROR_STATUS = 400;

export const getResponseContentType = (response: ApiResponse): string => {
    const header = response.headers.find(([name]) => name.toLowerCase() === CONTENT_TYPE_HEADER);

    return header?.[1] ?? '';
};

export const isErrorStatus = (status: number): boolean => status >= FIRST_ERROR_STATUS;
