import { validate, type RpcMethod } from '#shared/lib';

import { RpcError, RpcErrorCodes, rpcResponse, type RpcRequest } from './protocol.ts';

const INVALID_RESPONSE = 'invalid response';

/** Calls a background method. Throws RpcError on failure */
export const call = async <Params, Result>(method: RpcMethod<Params, Result>, params: Params): Promise<Result> => {
    const request: RpcRequest = { ik: 1, method: method.name, params };

    const raw: unknown = await chrome.runtime.sendMessage(request);

    const response = validate(rpcResponse, raw);

    if (!response.ok) {
        throw new RpcError(RpcErrorCodes.INTERNAL, INVALID_RESPONSE);
    }

    if (!response.value.ok) {
        throw new RpcError(response.value.error.code, response.value.error.message);
    }

    return response.value.result as Result;
};
