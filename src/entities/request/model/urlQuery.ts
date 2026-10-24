import type { KeyValue } from '#shared/lib';

/** A URL around its query; the ? and the # stay out of the parts */
interface UrlParts {
    /** Everything before the query */
    readonly base: string;
    /** The query without its ?; none for a URL without one */
    readonly query?: string;
    /** The fragment with its #, or nothing */
    readonly fragment: string;
}

const URL_MARKS = {
    QUERY_START: '?',
    FRAGMENT_START: '#',
    PAIR_SEPARATOR: '&',
    VALUE_SEPARATOR: '=',
} as const;

/** Characters that would split a parameter or end the query, and the % that starts an escape */
const QUERY_SPECIAL_RGX = /[%&#+]/g;

const splitUrl = (url: string): UrlParts => {
    const fragmentIdx = url.indexOf(URL_MARKS.FRAGMENT_START);
    const beforeFragment = fragmentIdx === -1 ? url : url.slice(0, fragmentIdx);
    const fragment = fragmentIdx === -1 ? '' : url.slice(fragmentIdx);
    const queryIdx = beforeFragment.indexOf(URL_MARKS.QUERY_START);

    if (queryIdx === -1) {
        return {
            base: beforeFragment,
            fragment,
        };
    }

    return {
        base: beforeFragment.slice(0, queryIdx),
        query: beforeFragment.slice(queryIdx + 1),
        fragment,
    };
};

const parseRawPair = (part: string): KeyValue => {
    const separatorIdx = part.indexOf(URL_MARKS.VALUE_SEPARATOR);

    if (separatorIdx === -1) {
        return {
            key: part,
            value: '',
            enabled: true,
        };
    }

    return {
        key: part.slice(0, separatorIdx),
        value: part.slice(separatorIdx + 1),
        enabled: true,
    };
};

export const parseRawQuery = (url: string): KeyValue[] => {
    const { query } = splitUrl(url);

    if (!query) {
        return [];
    }

    const result: KeyValue[] = [];
    const parts = query.split(URL_MARKS.PAIR_SEPARATOR);

    for (const part of parts) {
        if (part === '') {
            continue;
        }

        result.push(parseRawPair(part));
    }

    return result;
};

const isWrittenPair = (pair: KeyValue): boolean => pair.enabled && pair.key !== '';

const writeRawPair = (pair: KeyValue): string => {
    if (pair.value === '') {
        return pair.key;
    }

    return `${pair.key}${URL_MARKS.VALUE_SEPARATOR}${pair.value}`;
};

const writeQuery = (base: string, query: string, fragment: string): string => {
    if (query === '') {
        return `${base}${fragment}`;
    }

    return `${base}${URL_MARKS.QUERY_START}${query}${fragment}`;
};

export const replaceRawQuery = (url: string, pairs: readonly KeyValue[]): string => {
    const { base, fragment } = splitUrl(url);
    const queryParts: string[] = [];

    for (const pair of pairs) {
        if (!isWrittenPair(pair)) {
            continue;
        }

        queryParts.push(writeRawPair(pair));
    }

    const query = queryParts.join(URL_MARKS.PAIR_SEPARATOR);

    return writeQuery(base, query, fragment);
};

export const appendRawQuery = (url: string, parts: readonly string[]): string => {
    const { base, query, fragment } = splitUrl(url);

    const joinedParts = parts.join(URL_MARKS.PAIR_SEPARATOR);

    if (!query) {
        return writeQuery(base, joinedParts, fragment);
    }

    if (!joinedParts) {
        return writeQuery(base, query, fragment);
    }

    const fullQuery = `${query}${URL_MARKS.PAIR_SEPARATOR}${joinedParts}`;

    return writeQuery(base, fullQuery, fragment);
};

const encodeQueryText = (text: string): string => text.replace(QUERY_SPECIAL_RGX, char => encodeURIComponent(char));

const encodeQueryKey = (key: string): string =>
    encodeQueryText(key).replaceAll(URL_MARKS.VALUE_SEPARATOR, encodeURIComponent(URL_MARKS.VALUE_SEPARATOR));

export const encodeQueryPair = (pair: KeyValue): string =>
    `${encodeQueryKey(pair.key)}${URL_MARKS.VALUE_SEPARATOR}${encodeQueryText(pair.value)}`;
