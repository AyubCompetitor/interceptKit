import { getResponseContentType, type ApiResponse } from '#entities/request';
import { formatJsonText } from '#shared/lib';

/** How the body of a response is shown */
export enum ResponseBodyViewTypes {
    EMPTY = 'empty',
    JSON = 'json',
    TEXT = 'text',
    BINARY = 'binary',
}

interface EmptyBodyView {
    /** The response has no body */
    readonly viewType: ResponseBodyViewTypes.EMPTY;
}

interface JsonBodyView {
    /** JSON laid out with indents */
    readonly viewType: ResponseBodyViewTypes.JSON;
    /** The laid-out JSON */
    readonly text: string;
}

interface TextBodyView {
    /** Text shown as it came */
    readonly viewType: ResponseBodyViewTypes.TEXT;
    /** The body */
    readonly text: string;
}

interface BinaryBodyView {
    /** An image, a file or other bytes that are not text */
    readonly viewType: ResponseBodyViewTypes.BINARY;
    /** Content type of the body */
    readonly contentType: string;
}

export type ResponseBodyView = EmptyBodyView | JsonBodyView | TextBodyView | BinaryBodyView;

const BODY_TYPE_RGXS = {
    /** application/json, application/problem+json and the like */
    JSON: /[/+]json\b/i,
    /** Bytes that make no sense as text */
    BINARY: /^(image|audio|video|font)\/|^application\/(octet-stream|pdf|zip|gzip|wasm)\b/i,
} as const;

/** JSON is laid out when it parses; broken JSON is shown as it came */
const getJsonView = (body: string): ResponseBodyView => {
    const text = formatJsonText(body);

    if (text === undefined) {
        return { viewType: ResponseBodyViewTypes.TEXT, text: body };
    }

    return { viewType: ResponseBodyViewTypes.JSON, text };
};

export const getResponseBodyView = (response: ApiResponse): ResponseBodyView => {
    if (response.size === 0) {
        return { viewType: ResponseBodyViewTypes.EMPTY };
    }

    const contentType = getResponseContentType(response);

    if (BODY_TYPE_RGXS.BINARY.test(contentType)) {
        return { viewType: ResponseBodyViewTypes.BINARY, contentType };
    }

    if (BODY_TYPE_RGXS.JSON.test(contentType)) {
        return getJsonView(response.body);
    }

    return { viewType: ResponseBodyViewTypes.TEXT, text: response.body };
};
