import { useRef } from 'react';

import { vaultRpc, type Environment, type VariableValues } from '#entities/environment';
import { buildOutgoingRequest, type ApiRequest, type ApiResponse, type OutgoingRequest } from '#entities/request';
import { buildHostPattern, isHostCovered } from '#entities/site';
import { formatIssues, getErrorText, noop } from '#shared/lib';
import { executeRpc } from '#shared/messaging';
import { requestHostAccess, useHostPatterns } from '#shared/platform';

import { addHistoryEntry, buildHistoryEntry } from './historyEntries.ts';
import { buildApiRequest, type RequestDraft } from './requestDraft.ts';
import { resolveRequestVariables } from './requestVariables.ts';
import { sendWithRuleHeaders } from './ruleHeaders.ts';
import { IDLE_STATE, SENDING_STATE, SendStateTypes, TIMED_OUT_STATE, type SendState } from './sendState.ts';

const DOM_ERRORS = {
    ABORT: 'AbortError',
    TIMEOUT: 'TimeoutError',
} as const;

const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === DOM_ERRORS.ABORT;

const isTimeoutError = (error: unknown): boolean => error instanceof DOMException && error.name === DOM_ERRORS.TIMEOUT;

/** A cancelled request leaves the tab as it was before sending */
const mapErrorToSendState = (error: unknown): SendState => {
    if (isAbortError(error)) {
        return IDLE_STATE;
    }

    if (isTimeoutError(error)) {
        return TIMED_OUT_STATE;
    }

    return {
        stateType: SendStateTypes.FAILED,
        reason: getErrorText(error),
    };
};

const logHistoryFailure = (error: unknown) =>
    console.warn('[api-client] the request was not added to the history', error);

const saveToHistory = (typedRequest: ApiRequest, sentAt: number, response: NotRequired<ApiResponse>) => {
    addHistoryEntry(buildHistoryEntry(typedRequest, sentAt, response)).catch(logHistoryFailure);
};

/** A request with secrets is a use of the vault, so the auto-lock waits again */
const extendVaultUnlock = () => {
    executeRpc(vaultRpc.touch, null).catch(noop);
};

export const useRequestSender = (onSendStateChange: (tabId: string, sendState: SendState) => void) => {
    const patterns = useHostPatterns();
    const controllers = useRef(new Map<string, AbortController>());

    const sendOutgoing = (tabId: string, outgoing: OutgoingRequest, typedRequest: ApiRequest) => {
        const controller = new AbortController();
        const sentAt = Date.now();

        controllers.current.set(tabId, controller);

        onSendStateChange(tabId, SENDING_STATE);

        const onResponse = (response: ApiResponse) => {
            onSendStateChange(tabId, { stateType: SendStateTypes.RECEIVED, response });
            saveToHistory(typedRequest, sentAt, response);
        };

        const onFailure = (error: unknown) => {
            onSendStateChange(tabId, mapErrorToSendState(error));

            if (isAbortError(error)) {
                return;
            }

            saveToHistory(typedRequest, sentAt, undefined);
        };

        sendWithRuleHeaders(outgoing, controller.signal).then(onResponse).catch(onFailure);
    };

    const onRequestSend = (draft: RequestDraft, environment: NotRequired<Environment>, secrets: VariableValues) => {
        const tabId = draft.id;
        const typedRequest = buildApiRequest(draft);

        const { request, missingNames, secretNames } = resolveRequestVariables(typedRequest, environment, secrets);
        const lockedNames = missingNames.filter(name => secretNames.includes(name));

        if (lockedNames.length > 0) {
            onSendStateChange(tabId, { stateType: SendStateTypes.SECRETS_LOCKED, names: lockedNames });

            return;
        }

        if (missingNames.length > 0) {
            onSendStateChange(tabId, { stateType: SendStateTypes.MISSING_VARIABLES, names: missingNames });

            return;
        }

        const result = buildOutgoingRequest(request);

        if (!result.ok) {
            onSendStateChange(tabId, { stateType: SendStateTypes.INVALID, reason: formatIssues(result.issues) });

            return;
        }

        if (secretNames.length > 0) {
            extendVaultUnlock();
        }

        const outgoing = result.value;
        const { hostname } = new URL(outgoing.url);

        const isCovered = patterns !== undefined && isHostCovered(hostname, patterns);

        if (isCovered) {
            sendOutgoing(tabId, outgoing, typedRequest);

            return;
        }

        const noAccessState: SendState = { stateType: SendStateTypes.NO_ACCESS, host: hostname };

        const applyAccessAnswer = (isGranted: boolean) => {
            if (!isGranted) {
                onSendStateChange(tabId, noAccessState);

                return;
            }

            sendOutgoing(tabId, outgoing, typedRequest);
        };

        requestHostAccess(buildHostPattern(hostname, false))
            .then(applyAccessAnswer)
            .catch(() => onSendStateChange(tabId, noAccessState));
    };

    const onRequestCancel = (tabId: string) => {
        controllers.current.get(tabId)?.abort();
        controllers.current.delete(tabId);
    };

    return {
        onRequestSend,
        onRequestCancel,
    };
};
