import {
    buildMockMatchers,
    findPageMock,
    mockListMessage,
    type MockMatcher,
    type MockRequest,
    type PageMock,
} from '#entities/mock';
import { validate } from '#shared/lib';

const MOCK_LIST_WAIT_MS = 2000;

const MESSAGE_EVENT = 'message';

let matchers: readonly MockMatcher[] = [];

let isListReady = false;

const listReady = Promise.withResolvers<void>();

const markListReady: VoidFunction = () => {
    isListReady = true;

    listReady.resolve();
};

const onBridgeMessage = (event: MessageEvent<unknown>) => {
    const isFromThisWindow = event.source === window;

    if (!isFromThisWindow) {
        return;
    }

    const message = validate(mockListMessage, event.data);

    if (!message.ok) {
        return;
    }

    matchers = buildMockMatchers(message.value.mocks);

    markListReady();
};

export const startMockList: VoidFunction = () => {
    window.addEventListener(MESSAGE_EVENT, onBridgeMessage);

    window.setTimeout(markListReady, MOCK_LIST_WAIT_MS);
};

export const isMockListReady = (): boolean => isListReady;

export const waitForMockList = (): Promise<void> => listReady.promise;

export const findMock = (request: MockRequest): NotRequired<PageMock> => findPageMock(matchers, request);
