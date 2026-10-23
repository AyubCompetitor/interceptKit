import { MockBodyTypes, type MockBodyType, type MockResponse } from './mock.ts';

/** A response header as a name in lower case and its value */
export type MockHeader = [name: string, value: string];

const CONTENT_TYPE_HEADER = 'content-type';

/** fetch and XHR never show these to the page */
const HIDDEN_RESPONSE_HEADERS = new Set(['set-cookie', 'set-cookie2']);

const DEFAULT_CONTENT_TYPES: Record<MockBodyType, string> = {
    [MockBodyTypes.JSON]: 'application/json',
    [MockBodyTypes.TEXT]: 'text/plain;charset=UTF-8',
};

const isShownHeader = (header: MockHeader): boolean => !HIDDEN_RESPONSE_HEADERS.has(header[0]);

const isContentTypeHeader = (header: MockHeader): boolean => header[0] === CONTENT_TYPE_HEADER;

/** Headers fetch and XHR report the same way; a body without a content type gets one by its type */
export const buildMockHeaders = (response: MockResponse): MockHeader[] => {
    const enabledHeaders = response.headers.filter(header => header.enabled);
    const headers = enabledHeaders.map((header): MockHeader => [header.key.toLowerCase(), header.value]);
    const shownHeaders = headers.filter(isShownHeader);

    const isResponseBodyEmpty = response.body === '';
    const isHasContentType = shownHeaders.some(isContentTypeHeader);

    if (isResponseBodyEmpty || isHasContentType) {
        return shownHeaders;
    }

    return [...shownHeaders, [CONTENT_TYPE_HEADER, DEFAULT_CONTENT_TYPES[response.bodyType]]];
};

export const getMockHeader = (headers: readonly MockHeader[], name: string): Nullable<string> => {
    const lowerName = name.toLowerCase();
    const values = headers.filter(header => header[0] === lowerName).map(header => header[1]);

    if (values.length === 0) {
        return null;
    }

    return values.join(', ');
};
