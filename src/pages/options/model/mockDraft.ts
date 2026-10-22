import { MockBodyTypes, type Mock, type MockBodyType, type MockMatch } from '#entities/mock';
import { getRandomUUID, Sources, SyntaxTypes, type HttpMethod, type KeyValue } from '#shared/lib';

import type { SyntaxType } from './ruleDraft.ts';

/** A response header as the form edits it */
export interface MockHeaderDraft {
    /** React key of the row, never saved */
    readonly rowId: string;
    /** Header name */
    readonly name: string;
    /** Header value */
    readonly value: string;
    /** Disabled headers are kept but not sent */
    readonly enabled: boolean;
}

/** Every field of the mock form */
export interface MockDraft {
    /** Id of the edited mock or of the new one */
    readonly id: string;
    /** Name shown in the list */
    readonly name: string;
    /** Whether the mock answers */
    readonly enabled: boolean;

    /** Syntax of the URL pattern */
    readonly syntaxType: SyntaxType;
    /** URL pattern of the requests */
    readonly pattern: string;
    /** Chosen methods; none means any */
    readonly methods: readonly HttpMethod[];

    /** Status as typed; the background checks the range */
    readonly status: string;
    /** Delay in milliseconds as typed; empty means none */
    readonly delayMs: string;
    /** Format of the body */
    readonly bodyType: MockBodyType;
    /** Response body */
    readonly body: string;
    /** Response headers */
    readonly headers: readonly MockHeaderDraft[];
}

/** Props of a group of fields in the mock form */
export interface MockDraftFields {
    /** Current form state */
    draft: MockDraft;
    /** Merges changed fields into the form state */
    onDraftChange: MockDraftChange;
}

export type MockDraftPatch = Partial<MockDraft>;

/** Merges changed fields into the form state */
export type MockDraftChange = (patch: MockDraftPatch) => void;

/** Changes the header row with the id */
export type MockHeaderChange = (rowId: string, patch: Partial<MockHeaderDraft>) => void;

const DEFAULT_STATUS = '200';

const NEW_MOCK_DRAFT: Omit<MockDraft, 'id'> = {
    name: '',
    enabled: true,
    syntaxType: SyntaxTypes.FILTER,
    pattern: '',
    methods: [],
    status: DEFAULT_STATUS,
    delayMs: '',
    bodyType: MockBodyTypes.JSON,
    body: '',
    headers: [],
};

export const createMockHeaderDraft = (): MockHeaderDraft => ({
    rowId: getRandomUUID(),
    name: '',
    value: '',
    enabled: true,
});

const mapHeaderToDraft = (header: KeyValue): MockHeaderDraft => ({
    rowId: getRandomUUID(),
    name: header.key,
    value: header.value,
    enabled: header.enabled,
});

const mapDraftToHeader = (draft: MockHeaderDraft): KeyValue => ({
    key: draft.name.trim(),
    value: draft.value,
    enabled: draft.enabled,
});

const formatDelay = (delayMs: number): string => {
    if (delayMs === 0) {
        return '';
    }

    return String(delayMs);
};

/** Form state of a mock; an empty JSON mock when there is none */
export const createMockDraft = (mock: NotRequired<Mock>): MockDraft => {
    if (mock === undefined) {
        return { ...NEW_MOCK_DRAFT, id: getRandomUUID() };
    }

    const { match, response } = mock;

    return {
        id: mock.id,
        name: mock.name,
        enabled: mock.enabled,
        syntaxType: match.url.syntaxType,
        pattern: match.url.value,
        methods: match.methods ?? [],
        status: String(response.status),
        delayMs: formatDelay(response.delayMs),
        bodyType: response.bodyType,
        body: response.body,
        headers: response.headers.map(mapHeaderToDraft),
    };
};

/** An empty choice of methods is left out and means "any" */
const buildMockMatch = (draft: MockDraft): MockMatch => {
    const hasMethods = draft.methods.length > 0;

    return {
        url: { syntaxType: draft.syntaxType, value: draft.pattern.trim() },
        ...(hasMethods && { methods: draft.methods }),
    };
};

/** Empty means no delay; anything else that is not a number the background refuses */
const parseDelay = (delayMs: string): number => {
    const text = delayMs.trim();

    if (text === '') {
        return 0;
    }

    return Number(text);
};

/** The mock the form describes; the background validates it before saving */
export const buildMock = (draft: MockDraft): Mock => ({
    id: draft.id,
    name: draft.name.trim(),
    enabled: draft.enabled,
    source: Sources.USER,
    match: buildMockMatch(draft),
    response: {
        status: Number(draft.status.trim()),
        headers: draft.headers.map(mapDraftToHeader),
        bodyType: draft.bodyType,
        body: draft.body,
        delayMs: parseDelay(draft.delayMs),
    },
});

export const updateMockHeader = (
    headers: readonly MockHeaderDraft[],
    rowId: string,
    patch: Partial<MockHeaderDraft>,
): MockHeaderDraft[] => {
    return headers.map(header => {
        if (header.rowId !== rowId) {
            return header;
        }

        return { ...header, ...patch };
    });
};
