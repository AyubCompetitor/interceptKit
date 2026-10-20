import { literal, object, oneOf, optional, string, unknownValue, type Validator } from '#shared/lib';

/** Envelope of every runtime message we send */
export interface RpcRequest {
    /** Protocol marker and version */
    readonly ik: 1;
    /** Name of the called method */
    readonly method: string;
    /** Untrusted until the methods validator accepts them */
    readonly params?: unknown;
}

export enum RpcErrorCodes {
    BAD_REQUEST = 'bad_request',
    FORBIDDEN = 'forbidden',
    UNKNOWN_METHOD = 'unknown_method',
    INTERNAL = 'internal',
}

export type RpcErrorCode = `${RpcErrorCodes}`;

export type RpcErrorObject = Readonly<{
    code: RpcErrorCode;
    message: string;
}>;

export type RpcOKResponse = Readonly<{
    ok: true;
    result?: unknown;
}>;

export type RpcErrorResponse = Readonly<{
    ok: false;
    error: RpcErrorObject;
}>;

export type RpcResponse = RpcOKResponse | RpcErrorResponse;

export const RPC_ERROR_CODES = Object.values(RpcErrorCodes);

const RPC_ERROR_NAME = 'RpcError';

export const rpcRequest: Validator<RpcRequest> = object({
    ik: literal(1),
    method: string({ minLength: 1, maxLength: 128 }),
    params: optional(unknownValue),
});

const successResponse = object({
    ok: literal(true),
    result: optional(unknownValue),
});

const failureResponse = object({
    ok: literal(false),
    error: object({
        code: oneOf(RPC_ERROR_CODES),
        message: string({ maxLength: 2000 }),
    }),
});

export const rpcResponse: Validator<RpcResponse> = (input, path) => {
    const response = successResponse(input, path);

    if (!response.ok) {
        return failureResponse(input, path);
    }

    return response;
};

export const rpcFailure = (code: RpcErrorCode, message: string): RpcResponse => ({
    ok: false,
    error: {
        code,
        message,
    },
});

export const throwRpcError = (code: RpcErrorCode, message: string) => {
    throw new RpcError(code, message);
};

export class RpcError extends Error {
    readonly code: RpcErrorCode;

    constructor(code: RpcErrorCode, message: string) {
        super(message);
        this.name = RPC_ERROR_NAME;
        this.code = code;
    }
}
