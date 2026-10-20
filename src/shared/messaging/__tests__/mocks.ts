import { rs } from '@rstest/core';

import { defineMethod, number, object, RpcCallers } from '#shared/lib';

interface PairParams {
    /** First operand */
    a: number;
    /** Second operand */
    b: number;
}

export const EXTENSION_ID = 'abcdefghijklmnopabcdefghijklmnop';

export const EXTENSION_PAGE = { id: EXTENSION_ID, origin: `chrome-extension://${EXTENSION_ID}` };

export const CONTENT_SCRIPT = { id: EXTENSION_ID, origin: 'https://app.example.com', tab: { id: 7 } };

const pairParams = object({ a: number(), b: number() });

export const addMethod = defineMethod<PairParams, number>('math/add', pairParams);

export const pingMethod = defineMethod<PairParams, string>('bridge/ping', pairParams, [RpcCallers.CONTENT_SCRIPT]);

export const makeRequest = (method: string, params?: unknown) => ({ ik: 1, method, params });

/** Fake chrome.runtime whose sendMessage always answers with the given response */
export const installFakeRuntime = (response: unknown) => {
    const sendMessage = rs.fn(async () => response);

    Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: {
            runtime: {
                sendMessage,
            },
        },
    });

    return sendMessage;
};
