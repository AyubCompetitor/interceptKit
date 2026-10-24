import { sendRequest } from '../api/sendRequest.ts';

import { headerRulesRpc, type ApiResponse, type OutgoingRequest } from '#entities/request';
import { createQueue } from '#shared/lib';
import { executeRpc } from '#shared/messaging';

const enqueueRuleRequest = createQueue();

const logReleaseFailure = (error: unknown) => console.warn('[api-client] the header rule was not released', error);

const sendUnderRule = async (outgoing: OutgoingRequest, signal: AbortSignal): Promise<ApiResponse> => {
    signal.throwIfAborted();

    const host = new URL(outgoing.url).hostname;
    const { id } = await executeRpc(headerRulesRpc.apply, { host, headers: outgoing.ruleHeaders });

    try {
        return await sendRequest(outgoing, signal);
    } finally {
        executeRpc(headerRulesRpc.release, { id }).catch(logReleaseFailure);
    }
};

export const sendWithRuleHeaders = (outgoing: OutgoingRequest, signal: AbortSignal): Promise<ApiResponse> => {
    if (!outgoing.ruleHeaders.length) {
        return sendRequest(outgoing, signal);
    }

    return enqueueRuleRequest(() => sendUnderRule(outgoing, signal));
};
