import type { Validator } from './validation.ts';

/** Who may call a method (extension pages, or content scripts on web pages) */
export enum RpcCallers {
    EXTENSION = 'extension',
    CONTENT_SCRIPT = 'content-script',
}

export type RpcCaller = `${RpcCallers}`;

/** Contract of one background RPC method */
export interface RpcMethod<Params, Result> {
    /** Unique name */
    readonly name: string;
    /** Checks the parameters before the handler runs */
    readonly params: Validator<Params>;
    /** Contexts allowed to call the method */
    readonly callers: readonly RpcCaller[];
    /** Exists only for type inference */
    readonly result?: Result;
}

export const defineMethod = <Params, Result>(
    name: string,
    params: Validator<Params>,
    callers: readonly RpcCaller[] = [RpcCallers.EXTENSION],
): RpcMethod<Params, Result> => Object.freeze({ name, params, callers });
