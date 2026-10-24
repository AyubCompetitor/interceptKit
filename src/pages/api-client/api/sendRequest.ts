import type { ApiResponse, OutgoingRequest } from '#entities/request';
import { API_CLIENT_CONFIG } from '#shared/config';

const FETCH_DEFAULTS = {
    cache: 'no-store',
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
} as const;

const textDecoder = new TextDecoder();

/** The beginning of a body, cut at the size limit */
interface LimitedBody {
    /** Bytes that were read */
    readonly buffer: ArrayBuffer;
    /** The body went on past the limit */
    readonly isTruncated: boolean;
}

const buildFetchHeaders = (request: OutgoingRequest): Headers => {
    const headers = new Headers();

    for (const [name, value] of request.headers) {
        headers.append(name, value);
    }

    return headers;
};

/** Reads the body up to the limit and cancels the rest, so a huge response never fills the memory of the page */
export const readLimitedBody = async (response: Response, limit: number): Promise<LimitedBody> => {
    const reader = response.body?.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;

    if (!reader) {
        return {
            buffer: new ArrayBuffer(0),
            isTruncated: false,
        };
    }

    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        const room = limit - size;

        if (chunk.value.byteLength > room) {
            chunks.push(chunk.value.subarray(0, room));
            await reader.cancel();

            return {
                buffer: await new Blob(chunks).arrayBuffer(),
                isTruncated: true,
            };
        }

        chunks.push(chunk.value);
        size += chunk.value.byteLength;
    }

    return {
        buffer: await new Blob(chunks).arrayBuffer(),
        isTruncated: false,
    };
};

/** The timeout covers the whole response, body included; a cancel of the user stays an abort */
export const sendRequest = async (request: OutgoingRequest, signal: AbortSignal): Promise<ApiResponse> => {
    const startedAt = performance.now();
    const timeoutSignal = AbortSignal.timeout(API_CLIENT_CONFIG.REQUEST_TIMEOUT_MS);

    const response = await fetch(request.url, {
        ...FETCH_DEFAULTS,
        method: request.method,
        headers: buildFetchHeaders(request),
        ...(request.body !== undefined && { body: request.body }),
        credentials: request.credentials,
        signal: AbortSignal.any([signal, timeoutSignal]),
    });

    const { buffer, isTruncated } = await readLimitedBody(response, API_CLIENT_CONFIG.MAX_RESPONSE_BYTES);
    const durationMs = Math.round(performance.now() - startedAt);

    return {
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers],
        body: textDecoder.decode(buffer),
        size: buffer.byteLength,
        isTruncated,
        durationMs,
    };
};
