import { HttpMethods, type KeyValue } from '#shared/lib';

import { RequestBodyTypes } from '../request.ts';

export const makePair = (key: string, value: string, enabled = true): KeyValue => ({
    key,
    value,
    enabled,
});

/** Raw API client request as it comes from storage or an import; a POST with a JSON body unless overridden */
export const makeRequest = (overrides: Record<string, unknown> = {}) => ({
    id: 'q1',
    method: HttpMethods.POST,
    url: '{{baseUrl}}/users',
    query: [],
    headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
    body: { bodyType: RequestBodyTypes.JSON, text: '{"name":"{{name}}"}' },
    sendCookies: false,
    ...overrides,
});
