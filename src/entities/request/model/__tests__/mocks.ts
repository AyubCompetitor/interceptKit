/** Raw API client request as it comes from storage or an import; a POST with a JSON body unless overridden */
export const makeRequest = (overrides: Record<string, unknown> = {}) => ({
    id: 'q1',
    method: 'POST',
    url: '{{baseUrl}}/users',
    query: [],
    headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
    body: { bodyType: 'json', text: '{"name":"{{name}}"}' },
    sendCookies: false,
    ...overrides,
});
