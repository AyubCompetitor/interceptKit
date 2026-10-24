const FORBIDDEN_HEADERS: readonly string[] = [
    'accept-charset',
    'accept-encoding',
    'access-control-request-headers',
    'access-control-request-method',
    'connection',
    'content-length',
    'cookie',
    'cookie2',
    'date',
    'dnt',
    'expect',
    'host',
    'keep-alive',
    'origin',
    'referer',
    'set-cookie',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'user-agent',
    'via',
];

/** The browser builds these for every request itself, and a rule that changes them breaks the request */
const BROWSER_HEADERS: readonly string[] = [
    'connection',
    'content-length',
    'expect',
    'host',
    'keep-alive',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
];

const FORBIDDEN_PREFIXES: readonly string[] = ['proxy-', 'sec-'];

const METHOD_OVERRIDE_HEADERS: readonly string[] = ['x-http-method', 'x-http-method-override', 'x-method-override'];

const FORBIDDEN_METHODS: readonly string[] = ['CONNECT', 'TRACE', 'TRACK'];

const METHOD_LIST_SEPARATOR = ',';

const hasForbiddenMethod = (value: string): boolean => {
    const methods = value.split(METHOD_LIST_SEPARATOR).map(method => method.trim().toUpperCase());

    return methods.some(method => FORBIDDEN_METHODS.includes(method));
};

/** Whether the browser drops this header from a request that fetch() sends */
export const isForbiddenHeader = (name: string, value: string): boolean => {
    const lowerName = name.trim().toLowerCase();

    if (FORBIDDEN_HEADERS.includes(lowerName)) {
        return true;
    }

    const hasForbiddenPrefix = FORBIDDEN_PREFIXES.some(prefix => lowerName.startsWith(prefix));

    if (hasForbiddenPrefix) {
        return true;
    }

    const isMethodOverride = METHOD_OVERRIDE_HEADERS.includes(lowerName);

    return isMethodOverride && hasForbiddenMethod(value);
};

/** Whether the browser keeps this header to itself, so no rule may set it */
export const isBrowserHeader = (name: string): boolean => BROWSER_HEADERS.includes(name.trim().toLowerCase());
