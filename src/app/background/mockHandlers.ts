import {
    mocksItem,
    mocksRpc,
    mocksValidator,
    removeMock,
    upsertMock,
    type Mock,
    type MockIdParams,
    type PageMock,
} from '#entities/mock';
import { isOriginCovered } from '#entities/site';
import { formatIssues, Sources, validate, type TaskQueue } from '#shared/lib';
import { RpcErrorCodes, throwRpcError, type HandlerContext, type Router } from '#shared/messaging';
import { readItem, writeItem } from '#shared/platform';

import { readMockState, selectMockDelivery } from './mockSync.ts';

const SAVE_ERRORS = {
    POLICY_SOURCE: 'policy mocks come only from the administrator',
} as const;

const REMOVE_ERRORS = {
    POLICY_MOCK: 'only the administrator removes policy mocks',
} as const;

const isPolicyMock = (mocks: readonly Mock[], id: string): boolean =>
    mocks.some(mock => mock.id === id && mock.source === Sources.POLICY);

const saveMockHandler = async (mock: Mock, storageReady: Promise<void>): Promise<Mock> => {
    await storageReady;

    if (mock.source === Sources.POLICY) {
        throwRpcError(RpcErrorCodes.FORBIDDEN, SAVE_ERRORS.POLICY_SOURCE);
    }

    const mocks = await readItem(mocksItem);
    const nextMocks = upsertMock(mocks, mock);

    const listResult = validate(mocksValidator, nextMocks);

    if (!listResult.ok) {
        throwRpcError(RpcErrorCodes.BAD_REQUEST, formatIssues(listResult.issues));
    }

    await writeItem(mocksItem, nextMocks);

    return mock;
};

const removeMockHandler = async (mockIdParams: MockIdParams, storageReady: Promise<void>): Promise<void> => {
    await storageReady;

    const mocks = await readItem(mocksItem);

    if (isPolicyMock(mocks, mockIdParams.id)) {
        throwRpcError(RpcErrorCodes.FORBIDDEN, REMOVE_ERRORS.POLICY_MOCK);
    }

    await writeItem(mocksItem, removeMock(mocks, mockIdParams.id));
};

/** A page of a site without mocks gets none, whatever script asks */
const getPageMocksHandler = async (context: HandlerContext, storageReady: Promise<void>): Promise<PageMock[]> => {
    await storageReady;

    const state = await readMockState();
    const delivery = selectMockDelivery(state);

    const isMockPage = isOriginCovered(context.origin, delivery.patterns);

    if (!isMockPage) {
        return [];
    }

    return [...delivery.mocks];
};

export const registerMockHandlers = (router: Router, storageReady: Promise<void>, enqueue: TaskQueue): void => {
    router.on(mocksRpc.save, mock => enqueue(() => saveMockHandler(mock, storageReady)));
    router.on(mocksRpc.remove, params => enqueue(() => removeMockHandler(params, storageReady)));
    router.on(mocksRpc.forPage, (_params, context) => getPageMocksHandler(context, storageReady));
};
