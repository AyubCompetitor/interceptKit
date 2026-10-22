import {
    fail,
    httpMethod,
    HttpMethods,
    ok,
    splitShellWords,
    validate,
    type HttpMethod,
    type KeyValue,
    type Result,
} from '#shared/lib';

import { RequestBodyTypes, type RequestBody } from './request.ts';

/** What a curl command describes, ready to become an API client request */
export interface CurlImport {
    /** HTTP method */
    readonly method: HttpMethod;
    /** URL without its query */
    readonly url: string;
    /** Query parameters of the URL */
    readonly query: readonly KeyValue[];
    /** Request headers in the order of the command */
    readonly headers: readonly KeyValue[];
    /** Request body */
    readonly body: RequestBody;
}

/** What the options of the command have set so far */
interface CurlOptions {
    /** Method of -X */
    method?: string;
    /** The first URL of the command */
    url?: string;
    /** Headers, cookies and credentials in the order of the command */
    headers: KeyValue[];
    /** Data parts, which curl joins with & */
    data: string[];
    /** -G: the data goes to the query of a GET request */
    isGet: boolean;
    /** -I: a HEAD request */
    isHead: boolean;
}

type ValueOption = (options: CurlOptions, value: string) => void;

type FlagOption = (options: CurlOptions) => void;

const ROOT_PATH = '$';

const CURL_ERRORS = {
    NOT_CURL: 'the command does not start with curl',
    OPEN_QUOTE: 'a quote is not closed',
    NO_URL: 'the command has no URL',
    MISSING_VALUE: 'needs a value',
    UNSUPPORTED_METHOD: 'is not a method the API client sends',
    UNSUPPORTED_OPTION: 'is not supported: multipart forms and file uploads cannot be imported',
} as const;

const CURL_RGXS = {
    /** curl, curl.exe or a path to either */
    PROGRAM: /(^|[\\/])curl(\.exe)?$/i,
    /** A short option with its value glued on, such as -XPOST */
    GLUED_SHORT_OPTION: /^-[A-Za-z]./,
    /** application/json, application/problem+json and the like */
    JSON_TYPE: /[/+]json\b/i,
    PLUS: /\+/g,
} as const;

const HEADERS = {
    ACCEPT: 'Accept',
    AUTHORIZATION: 'Authorization',
    CONTENT_TYPE: 'Content-Type',
    COOKIE: 'Cookie',
    REFERER: 'Referer',
    USER_AGENT: 'User-Agent',
} as const;

const JSON_TYPE = 'application/json';

/** What curl sends with -d when the command sets no content type */
const FORM_TYPE = 'application/x-www-form-urlencoded';

/** curl assumes http for a URL without a scheme */
const DEFAULT_SCHEME = 'http://';

const SCHEME_SEPARATOR = '://';

const makePair = (key: string, value: string): KeyValue => ({
    key,
    value,
    enabled: true,
});

const encodeBase64 = (text: string): string => {
    const bytes = new TextEncoder().encode(text);

    return btoa(String.fromCodePoint(...bytes));
};

/** Form encoding writes spaces as +; a malformed escape stays as typed */
const decodeFormPart = (part: string): string => {
    try {
        return decodeURIComponent(part.replace(CURL_RGXS.PLUS, ' '));
    } catch {
        return part;
    }
};

/** --data-urlencode takes "content", "=content" or "name=content" and encodes the content */
const encodeDataPart = (value: string): string => {
    const separator = value.indexOf('=');

    if (separator === -1) {
        return encodeURIComponent(value);
    }

    const name = value.slice(0, separator);
    const content = encodeURIComponent(value.slice(separator + 1));

    if (name === '') {
        return content;
    }

    return `${name}=${content}`;
};

/** "Name;" sends an empty header in curl, which fetch cannot do: such headers are left out */
const addHeader: ValueOption = (options, value) => {
    const separator = value.indexOf(':');

    if (separator === -1) {
        return;
    }

    options.headers.push(makePair(value.slice(0, separator).trim(), value.slice(separator + 1).trim()));
};

const setMethod: ValueOption = (options, value) => {
    options.method = value.toUpperCase();
};

const setUrl: ValueOption = (options, value) => {
    options.url ??= value;
};

const addData: ValueOption = (options, value) => {
    options.data.push(value);
};

const addUrlEncodedData: ValueOption = (options, value) => {
    options.data.push(encodeDataPart(value));
};

const addJson: ValueOption = (options, value) => {
    options.data.push(value);

    options.headers.push(makePair(HEADERS.CONTENT_TYPE, JSON_TYPE), makePair(HEADERS.ACCEPT, JSON_TYPE));
};

const addBasicAuth: ValueOption = (options, value) => {
    options.headers.push(makePair(HEADERS.AUTHORIZATION, `Basic ${encodeBase64(value)}`));
};

/** Without = the value names a cookie file, which cannot be imported */
const addCookie: ValueOption = (options, value) => {
    if (!value.includes('=')) {
        return;
    }

    options.headers.push(makePair(HEADERS.COOKIE, value));
};

const addUserAgent: ValueOption = (options, value) => {
    options.headers.push(makePair(HEADERS.USER_AGENT, value));
};

const addReferer: ValueOption = (options, value) => {
    options.headers.push(makePair(HEADERS.REFERER, value));
};

const setGet: FlagOption = options => {
    options.isGet = true;
};

const setHead: FlagOption = options => {
    options.isHead = true;
};

const VALUE_OPTIONS: Readonly<Record<string, ValueOption>> = {
    '-X': setMethod,
    '--request': setMethod,
    '-H': addHeader,
    '--header': addHeader,
    '-d': addData,
    '--data': addData,
    '--data-raw': addData,
    '--data-binary': addData,
    '--data-ascii': addData,
    '--data-urlencode': addUrlEncodedData,
    '--json': addJson,
    '-u': addBasicAuth,
    '--user': addBasicAuth,
    '-b': addCookie,
    '--cookie': addCookie,
    '-A': addUserAgent,
    '--user-agent': addUserAgent,
    '-e': addReferer,
    '--referer': addReferer,
    '--url': setUrl,
};

const FLAG_OPTIONS: Readonly<Record<string, FlagOption>> = {
    '-G': setGet,
    '--get': setGet,
    '-I': setHead,
    '--head': setHead,
};

/** Options whose value the request has no use for: output, timeouts, proxies, certificates */
const SKIPPED_VALUE_OPTIONS = new Set([
    '-o',
    '--output',
    '-m',
    '--max-time',
    '--connect-timeout',
    '--retry',
    '-x',
    '--proxy',
    '-w',
    '--write-out',
    '-c',
    '--cookie-jar',
    '--cacert',
    '-E',
    '--cert',
    '--key',
]);

const UNSUPPORTED_OPTIONS = new Set(['-F', '--form', '--form-string', '-T', '--upload-file']);

/** curl reads -XPOST as -X POST; long options always take their value from the next word */
const splitGluedOption = (word: string): [name: string, gluedValue: NotRequired<string>] => {
    const isGlued = CURL_RGXS.GLUED_SHORT_OPTION.test(word);

    if (!isGlued) {
        return [word, undefined];
    }

    return [word.slice(0, 2), word.slice(2)];
};

const isOptionWord = (word: string): boolean => word.startsWith('-') && word.length > 1;

const readOptions = (words: readonly string[]): Result<CurlOptions> => {
    const options: CurlOptions = { headers: [], data: [], isGet: false, isHead: false };
    let index = 0;

    while (index < words.length) {
        const word = words[index] ?? '';

        index += 1;

        if (!isOptionWord(word)) {
            setUrl(options, word);

            continue;
        }

        const [name, gluedValue] = splitGluedOption(word);

        if (UNSUPPORTED_OPTIONS.has(name)) {
            return fail(ROOT_PATH, `${name} ${CURL_ERRORS.UNSUPPORTED_OPTION}`);
        }

        const valueOption = VALUE_OPTIONS[name];
        const isValueOption = valueOption !== undefined || SKIPPED_VALUE_OPTIONS.has(name);

        /** Other flags, such as --compressed or -sSL, change nothing in the request */
        if (!isValueOption) {
            FLAG_OPTIONS[name]?.(options);

            continue;
        }

        const value = gluedValue ?? words[index];

        if (gluedValue === undefined) {
            index += 1;
        }

        if (value === undefined) {
            return fail(ROOT_PATH, `${name} ${CURL_ERRORS.MISSING_VALUE}`);
        }

        valueOption?.(options, value);
    }

    return ok(options);
};

const isHttpMethod = (value: string): value is HttpMethod => validate(httpMethod, value).ok;

const getMethod = (options: CurlOptions): string => {
    if (options.method !== undefined) {
        return options.method;
    }

    if (options.isHead) {
        return HttpMethods.HEAD;
    }

    const hasBody = options.data.length > 0 && !options.isGet;

    if (hasBody) {
        return HttpMethods.POST;
    }

    return HttpMethods.GET;
};

const getHeaderValue = (headers: readonly KeyValue[], name: string): NotRequired<string> => {
    const lowerName = name.toLowerCase();

    return headers.findLast(header => header.key.toLowerCase() === lowerName)?.value;
};

const parseFormPair = (part: string): KeyValue => {
    const separator = part.indexOf('=');

    if (separator === -1) {
        return makePair(decodeFormPart(part), '');
    }

    return makePair(decodeFormPart(part.slice(0, separator)), decodeFormPart(part.slice(separator + 1)));
};

/** Fields of a=1&b=2; nothing when some part is not a field */
const parseFormFields = (text: string): NotRequired<KeyValue[]> => {
    const parts = text.split('&').filter(part => part !== '');
    const isForm = parts.length > 0 && parts.every(part => part.includes('='));

    if (!isForm) {
        return;
    }

    return parts.map(parseFormPair);
};

const buildBody = (options: CurlOptions): RequestBody => {
    const hasBody = options.data.length > 0 && !options.isGet;

    if (!hasBody) {
        return { bodyType: RequestBodyTypes.NONE };
    }

    const text = options.data.join('&');
    const contentType = getHeaderValue(options.headers, HEADERS.CONTENT_TYPE) ?? FORM_TYPE;

    if (CURL_RGXS.JSON_TYPE.test(contentType)) {
        return { bodyType: RequestBodyTypes.JSON, text };
    }

    const isFormType = contentType.toLowerCase().startsWith(FORM_TYPE);
    const fields = isFormType ? parseFormFields(text) : undefined;

    if (fields) {
        return { bodyType: RequestBodyTypes.FORM, fields };
    }

    return { bodyType: RequestBodyTypes.RAW, text, contentType };
};

/** The URL without its query, and the query as pairs; -G adds the data to the query */
const splitUrl = (options: CurlOptions, rawUrl: string): Pick<CurlImport, 'url' | 'query'> => {
    const hasScheme = rawUrl.includes(SCHEME_SEPARATOR);
    const fullUrl = hasScheme ? rawUrl : DEFAULT_SCHEME + rawUrl;
    const dataQuery = options.isGet ? options.data.flatMap(part => part.split('&')).map(parseFormPair) : [];

    if (!URL.canParse(fullUrl)) {
        return {
            url: rawUrl,
            query: dataQuery,
        };
    }

    const url = new URL(fullUrl);
    const urlQuery = [...url.searchParams].map(([key, value]) => makePair(key, value));

    url.search = '';

    return {
        url: url.href,
        query: [...urlQuery, ...dataQuery],
    };
};

/** Reads a curl command, for example from the browser's "Copy as cURL (bash)" */
export const parseCurl = (command: string): Result<CurlImport> => {
    const words = splitShellWords(command.trim());

    if (!words) {
        return fail(ROOT_PATH, CURL_ERRORS.OPEN_QUOTE);
    }

    const [program = '', ...args] = words;

    if (!CURL_RGXS.PROGRAM.test(program)) {
        return fail(ROOT_PATH, CURL_ERRORS.NOT_CURL);
    }

    const optionsResult = readOptions(args);

    if (!optionsResult.ok) {
        return optionsResult;
    }

    const options = optionsResult.value;

    if (options.url === undefined) {
        return fail(ROOT_PATH, CURL_ERRORS.NO_URL);
    }

    const method = getMethod(options);

    if (!isHttpMethod(method)) {
        return fail(ROOT_PATH, `${method} ${CURL_ERRORS.UNSUPPORTED_METHOD}`);
    }

    return ok({
        method,
        ...splitUrl(options, options.url),
        headers: options.headers,
        body: buildBody(options),
    });
};
