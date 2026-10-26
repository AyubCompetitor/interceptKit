import { mocksRpc, type MockListMessage, type PageMock } from '#entities/mock';
import { executeRpc } from '#shared/messaging';

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
        xr: 1,
        mocks,
    };

    window.postMessage(message, getTargetOrigin());
};

export const startBridge: VoidFunction = () => {
    executeRpc(mocksRpc.forPage, null)
        .then(postMockList)
        .catch(() => postMockList([]));
};
