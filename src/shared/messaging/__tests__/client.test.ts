import { describe, expect, it } from '@rstest/core';

import { executeRpc } from '../client.ts';
import { RpcError, RpcErrorCodes } from '../protocol.ts';

import { addMethod, installFakeRuntime } from './mocks.ts';

describe('executeRpc', () => {
    it('sends the request envelope and returns the result', async () => {
        const sendMessage = installFakeRuntime({ ok: true, result: 5 });

        expect(await executeRpc(addMethod, { a: 2, b: 3 })).toBe(5);

        expect(sendMessage).toHaveBeenCalledWith({ ik: 1, method: 'math/add', params: { a: 2, b: 3 } });
    });

    it('turns an error response into RpcError with its code and message', async () => {
        installFakeRuntime({ ok: false, error: { code: RpcErrorCodes.FORBIDDEN, message: 'not allowed' } });

        const request = executeRpc(addMethod, { a: 1, b: 1 });

        await expect(request).rejects.toBeInstanceOf(RpcError);

        await expect(request).rejects.toMatchObject({ code: RpcErrorCodes.FORBIDDEN, message: 'not allowed' });
    });

    it.each([undefined, 'oops', { ok: 'yes' }])(
        'treats a malformed response as an internal error: %j',
        async response => {
            installFakeRuntime(response);

            await expect(executeRpc(addMethod, { a: 1, b: 1 })).rejects.toMatchObject({ code: RpcErrorCodes.INTERNAL });
        },
    );
});
