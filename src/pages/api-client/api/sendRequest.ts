import type { ApiResponse, OutgoingRequest } from '#entities/request';

/** The API client always asks the server and tells it nothing about the extension's own pages */
const FETCH_DEFAULTS = {
    cache: 'no-store',
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
} as const;

const textDecoder = new TextDecoder();

const buildFetchHeaders = (request: OutgoingRequest): Headers => {
    const headers = new Headers();

    for (const [name, value] of request.headers) {
        headers.append(name, value);
    }

    return headers;
};

/** The only network call of the extension: it sends a request the user started */
export const sendRequest = async (request: OutgoingRequest, signal: AbortSignal): Promise<ApiResponse> => {
    const startedAt = performance.now();

    const response = await fetch(request.url, {
        ...FETCH_DEFAULTS,
        method: request.method,
        headers: buildFetchHeaders(request),
        ...(request.body !== undefined && { body: request.body }),
        credentials: request.credentials,
        signal,
    });

    const buffer = await response.arrayBuffer();
    const durationMs = Math.round(performance.now() - startedAt);

    return {
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers],
        body: textDecoder.decode(buffer),
        size: buffer.byteLength,
        durationMs,
    };
};
