import {
    isBodylessMethod,
    isForbiddenHeader,
    RequestBodyTypes,
    type ApiRequest,
    type RequestBody,
    type RequestBodyType,
} from '#entities/request';
import { getRandomUUID, HttpMethods, mapRowToKeyValue, type HttpMethod, type KeyValueRow } from '#shared/lib';

/** Every field of a request tab; each body format keeps its own text, so switching the format loses nothing */
export interface RequestDraft {
    /** Id of the request, also the id of its tab */
    readonly id: string;
    /** HTTP method */
    readonly method: HttpMethod;
    /** URL as typed */
    readonly url: string;
    /** Query parameters added to the URL */
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

const DEFAULT_RAW_TYPE = 'text/plain';

const NEW_REQUEST_DRAFT: Omit<RequestDraft, 'id'> = {
    method: HttpMethods.GET,
    url: '',
    query: [],
    headers: [],
    bodyType: RequestBodyTypes.NONE,
    jsonBody: '',
    rawBody: '',
    rawContentType: DEFAULT_RAW_TYPE,
    formFields: [],
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
        return { bodyType: RequestBodyTypes.NONE };
    }

    return BODY_BUILDERS[draft.bodyType](draft);
};

const isDroppedHeader = (row: KeyValueRow): boolean => {
    const name = row.key.trim();

    return row.enabled && name !== '' && isForbiddenHeader(name, row.value);
};

/** Names of the enabled headers the browser drops, so the editor can say they are not sent */
export const getDroppedHeaderNames = (draft: RequestDraft): string[] => {
    return draft.headers.filter(isDroppedHeader).map(row => row.key.trim());
};

/** The request the tab describes, as typed */
export const buildApiRequest = (draft: RequestDraft): ApiRequest => ({
    id: draft.id,
    method: draft.method,
    url: draft.url,
    query: draft.query.map(mapRowToKeyValue),
    headers: draft.headers.map(mapRowToKeyValue),
    body: buildBody(draft),
    sendCookies: draft.sendCookies,
});
