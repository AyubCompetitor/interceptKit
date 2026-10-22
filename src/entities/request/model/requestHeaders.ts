/** Headers fetch() drops without an error: the list of the Fetch standard, plus User-Agent, which Chromium drops too */
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

const FORBIDDEN_PREFIXES: readonly string[] = ['proxy-', 'sec-'];

/** Dropped only when they name a method that fetch() refuses */
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
