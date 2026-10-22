import { mocksRpc, type MockListMessage, type PageMock } from '#entities/mock';
import { executeRpc } from '#shared/messaging';

/** Origin of a sandboxed frame, which postMessage cannot target */
const OPAQUE_ORIGIN = 'null';

const ANY_ORIGIN = '*';

const getTargetOrigin = (): string => {
    if (location.origin === OPAQUE_ORIGIN) {
        return ANY_ORIGIN;
    }

    return location.origin;
};

const postMockList = (mocks: readonly PageMock[]) => {
    const message: MockListMessage = {
        ik: 1,
        mocks,
    };

    window.postMessage(message, getTargetOrigin());
};

/** Hands the site's mocks to the interceptor; after a failure an empty list sends waiting requests on */
export const startBridge: VoidFunction = () => {
    executeRpc(mocksRpc.forPage, null)
        .then(postMockList)
        .catch(() => postMockList([]));
};
