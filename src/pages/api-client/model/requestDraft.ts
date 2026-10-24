import {
    isBodylessMethod,
    isBrowserHeader,
    isForbiddenHeader,
    parseRawQuery,
    replaceRawQuery,
    RequestBodyTypes,
    type ApiRequest,
    type CurlImport,
    type RequestBody,
    type RequestBodyType,
} from '#entities/request';
import {
    getRandomUUID,
    HttpMethods,
    mapKeyValueToRow,
    mapRowToKeyValue,
    type HttpMethod,
    type KeyValueRow,
} from '#shared/lib';

/** Every field of a request tab; each body format keeps its own text, so switching the format loses nothing */
export interface RequestDraft {
    /** Id of the request, also the id of its tab */
    readonly id: string;
    /** HTTP method */
    readonly method: HttpMethod;
    /** URL as typed, with its query */
    readonly url: string;
    /** The query of the URL, raw, then the switched-off parameters that only the table keeps */
    readonly query: readonly KeyValueRow[];
    /** Request headers */
    readonly headers: readonly KeyValueRow[];

    /** Format of the body */
    readonly bodyType: RequestBodyType;
    /** Text of the JSON body */
    readonly jsonBody: string;
    /** Text of the raw body */
    readonly rawBody: string;
    /** Content type of the raw body */
    readonly rawContentType: string;
    /** Fields of the form body */
    readonly formFields: readonly KeyValueRow[];

    /** Whether the browser adds the site's cookies */
    readonly sendCookies: boolean;
}

export type RequestDraftPatch = Partial<Omit<RequestDraft, 'id'>>;

/** Merges changed fields into the request of the tab */
export type RequestDraftChange = (patch: RequestDraftPatch) => void;

/** Props of a group of fields in the request editor */
export interface RequestDraftFields {
    /** Current request */
    draft: RequestDraft;
    /** Merges changed fields into the request */
    onDraftChange: RequestDraftChange;
}

/** Fields that hold the body in each of its formats */
type DraftBodyFields = Pick<RequestDraft, 'bodyType' | 'jsonBody' | 'rawBody' | 'rawContentType' | 'formFields'>;

const DEFAULT_RAW_TYPE = 'text/plain';

/** Every format empty, so the one chosen later starts clean */
const EMPTY_BODY_FIELDS: Omit<DraftBodyFields, 'bodyType'> = {
    jsonBody: '',
    rawBody: '',
    rawContentType: DEFAULT_RAW_TYPE,
    formFields: [],
};

const NEW_REQUEST_DRAFT: Omit<RequestDraft, 'id'> = {
    method: HttpMethods.GET,
    url: '',
    query: [],
    headers: [],
    bodyType: RequestBodyTypes.NONE,
    ...EMPTY_BODY_FIELDS,
    sendCookies: false,
};

const BODY_BUILDERS: Record<RequestBodyType, (draft: RequestDraft) => RequestBody> = {
    [RequestBodyTypes.NONE]: () => ({ bodyType: RequestBodyTypes.NONE }),
    [RequestBodyTypes.JSON]: draft => ({ bodyType: RequestBodyTypes.JSON, text: draft.jsonBody }),
    [RequestBodyTypes.RAW]: draft => ({
        bodyType: RequestBodyTypes.RAW,
        text: draft.rawBody,
        contentType: draft.rawContentType,
    }),
    [RequestBodyTypes.FORM]: draft => ({
        bodyType: RequestBodyTypes.FORM,
        fields: draft.formFields.map(mapRowToKeyValue),
    }),
};

export const createRequestDraft = (): RequestDraft => ({ ...NEW_REQUEST_DRAFT, id: getRandomUUID() });

/** GET and HEAD go without a body, which the editor keeps for when the method changes; the form says so */
const buildBody = (draft: RequestDraft): RequestBody => {
    if (isBodylessMethod(draft.method)) {
        return {
            bodyType: RequestBodyTypes.NONE,
        };
    }

    return BODY_BUILDERS[draft.bodyType](draft);
};

const isDroppedHeader = (row: KeyValueRow): boolean => {
    const name = row.key.trim();

    return row.enabled && name !== '' && isForbiddenHeader(name, row.value);
};

const getRowName = (row: KeyValueRow): string => row.key.trim();

const getFilteredHeaderNames = (
    headers: readonly KeyValueRow[],
    predicate: (row: KeyValueRow) => boolean,
): string[] => {
    const result: string[] = [];

    for (const row of headers) {
        if (!isDroppedHeader(row) || !predicate(row)) {
            continue;
        }

        result.push(getRowName(row));
    }

    return result;
};

export const getRuleHeaderNames = (draft: RequestDraft): string[] =>
    getFilteredHeaderNames(draft.headers, row => !isBrowserHeader(row.key));

export const getBrowserHeaderNames = (draft: RequestDraft): string[] =>
    getFilteredHeaderNames(draft.headers, row => isBrowserHeader(row.key));

export const buildApiRequest = (draft: RequestDraft): ApiRequest => ({
    id: draft.id,
    method: draft.method,
    url: draft.url,
    query: draft.query.map(mapRowToKeyValue),
    headers: draft.headers.map(mapRowToKeyValue),
    body: buildBody(draft),
    sendCookies: draft.sendCookies,
});

const mapBodyToDraft = (body: RequestBody): DraftBodyFields => {
    const emptyFields: DraftBodyFields = { ...EMPTY_BODY_FIELDS, bodyType: body.bodyType };

    if (body.bodyType === RequestBodyTypes.JSON) {
        return {
            ...emptyFields,
            jsonBody: body.text,
        };
    }

    if (body.bodyType === RequestBodyTypes.RAW) {
        return {
            ...emptyFields,
            rawBody: body.text,
            rawContentType: body.contentType,
        };
    }

    if (body.bodyType === RequestBodyTypes.FORM) {
        return {
            ...emptyFields,
            formFields: body.fields.map(mapKeyValueToRow),
        };
    }

    return emptyFields;
};

export const mapRequestToDraft = (request: ApiRequest): RequestDraft => ({
    id: request.id,
    method: request.method,
    url: request.url,
    query: request.query.map(mapKeyValueToRow),
    headers: request.headers.map(mapKeyValueToRow),
    ...mapBodyToDraft(request.body),
    sendCookies: request.sendCookies,
});

export const copyRequestToDraft = (request: ApiRequest): RequestDraft => ({
    ...mapRequestToDraft(request),
    id: getRandomUUID(),
});

/** Cookies of the command arrive as a header, so the cookie switch stays off */
export const mapCurlToDraft = (imported: CurlImport): RequestDraft => ({
    ...createRequestDraft(),
    method: imported.method,
    url: imported.url,
    query: imported.query.map(mapKeyValueToRow),
    headers: imported.headers.map(mapKeyValueToRow),
    ...mapBodyToDraft(imported.body),
});

export const syncQueryWithUrl = (draft: RequestDraft, url: string): RequestDraftPatch => {
    const [enabledRows, disabledRows] = draft.query.reduce<[KeyValueRow[], KeyValueRow[]]>(
        (acc, row) => {
            acc[row.enabled ? 0 : 1].push(row);
            return acc;
        },
        [[], []],
    );

    const urlRows = parseRawQuery(url).map((pair, idx) => ({
        ...pair,
        rowId: enabledRows[idx]?.rowId ?? getRandomUUID(),
    }));

    return {
        url,
        query: urlRows.concat(disabledRows),
    };
};

/** An edited table rewrites the query of the URL from its switched-on rows */
export const syncUrlWithQuery = (draft: RequestDraft, query: readonly KeyValueRow[]): RequestDraftPatch => ({
    url: replaceRawQuery(draft.url, query),
    query,
});
