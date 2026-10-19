import { formatIssues, RpcCallers, validate, type RpcCaller, type RpcMethod } from '#shared/lib';

import { rpcFailure, RpcErrorCodes, rpcRequest, type RpcResponse } from './protocol.ts';

/** Content scripts may call us only from https pages. */
const WEB_ORIGIN_RGX = /^https?:\/\//;

/** The parts of chrome.runtime.MessageSender the router relies on */
export interface MessageSender {
    /** Id of the sending extension */
    readonly id?: string;
    /** Origin of the sending page or frame */
    readonly origin?: string;
    /** Present when a content script sent the message */
    readonly tab?: unknown;
}

export interface HandlerContext {
    /** Kind of context that called the method */
    readonly caller: RpcCaller;
    /** Origin reported by the browser, never taken from the message itself */
    readonly origin: string;
}

export type Handler<Params, Result> = (params: Params, context: HandlerContext) => Result | Promise<Result>;

/** A registered method */
interface Route {
    /** Contexts allowed to call the method */
    readonly callers: readonly RpcCaller[];
    /** Validates raw params and runs the handler */
    readonly run: (rawParams: unknown, context: HandlerContext) => Promise<RpcResponse>;
}

export interface Router {
    /** Registers the handler of a method */
    handle<Params, Result>(method: RpcMethod<Params, Result>, handler: Handler<Params, Result>): void;
    /** Resolves to undefined for messages that are not ours */
    dispatch(message: unknown, sender: MessageSender): Promise<NotRequired<RpcResponse>>;
    /** Subscribes to chrome.runtime.onMessage */
    listen(): void;
}

interface RouterOptions {
    /** Id of this extension */
    readonly extensionId: string;
}

export const createRouter = ({ extensionId }: RouterOptions): Router => {
    const extensionOrigin = `chrome-extension://${extensionId}`;
    const routes = new Map<string, Route>();

    const getCtx = (sender: MessageSender): NotRequired<HandlerContext> => {
        if (sender.id !== extensionId || sender.origin === undefined) {
            return;
        }

        if (sender.origin === extensionOrigin) {
            return {
                caller: RpcCallers.EXTENSION,
                origin: sender.origin,
            };
        }

        if (sender.tab !== undefined && WEB_ORIGIN_RGX.test(sender.origin)) {
            return {
                caller: RpcCallers.CONTENT_SCRIPT,
                origin: sender.origin,
            };
        }

        return;
    };

    const dispatch = async (message: unknown, sender: MessageSender): Promise<NotRequired<RpcResponse>> => {
        const request = validate(rpcRequest, message);

        if (!request.ok) {
            return;
        }

        const { method, params } = request.value;

        const context = getCtx(sender);

        if (context === undefined) {
            return rpcFailure(RpcErrorCodes.FORBIDDEN, 'sender is not allowed');
        }

        const route = routes.get(method);

        if (route === undefined) {
            return rpcFailure(RpcErrorCodes.UNKNOWN_METHOD, `unknown method ${method}`);
        }

        if (!route.callers.includes(context.caller)) {
            return rpcFailure(RpcErrorCodes.FORBIDDEN, `${context.caller} may not call ${method}`);
        }

        try {
            return await route.run(params, context);
        } catch (error) {
            console.error(`[rpc] ${method} failed`, error);

            return rpcFailure(RpcErrorCodes.INTERNAL, 'internal error');
        }
    };

    const handle: Router['handle'] = (method, handler) => {
        if (routes.has(method.name)) {
            throw new Error(`Duplicate handler for ${method.name}`);
        }

        routes.set(method.name, {
            callers: method.callers,
            run: async (rawParams, context) => {
                const params = validate(method.params, rawParams);

                if (!params.ok) {
                    return rpcFailure(RpcErrorCodes.BAD_REQUEST, formatIssues(params.issues));
                }

                return {
                    ok: true,
                    result: await handler(params.value, context),
                };
            },
        });
    };

    const listen: VoidFunction = () => {
        chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
            if (!validate(rpcRequest, message).ok) {
                return false;
            }

            dispatch(message, sender).then(sendResponse, (error: unknown) => {
                console.error('[rpc] dispatch failed', error);
            });

            return true;
        });
    };

    return {
        handle,
        dispatch,
        listen,
    };
};
