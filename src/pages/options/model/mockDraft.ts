import { MockBodyTypes, type Mock, type MockBodyType, type MockMatch } from '#entities/mock';
import {
    getRandomUUID,
    mapKeyValueToRow,
    mapRowToKeyValue,
    Sources,
    SyntaxTypes,
    type HttpMethod,
    type KeyValue,
    type KeyValueRow,
} from '#shared/lib';

import type { SyntaxType } from './ruleDraft.ts';

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
    readonly headers: readonly KeyValueRow[];
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

/** Header names are tokens, so spaces around them are a typing slip */
const mapRowToHeader = (row: KeyValueRow): KeyValue => ({
    ...mapRowToKeyValue(row),
    key: row.key.trim(),
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
        headers: response.headers.map(mapKeyValueToRow),
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
        headers: draft.headers.map(mapRowToHeader),
        bodyType: draft.bodyType,
        body: draft.body,
        delayMs: parseDelay(draft.delayMs),
    },
});
