import { useRef } from 'react';

import { sendRequest } from '../api/sendRequest.ts';

import type { Environment } from '#entities/environment';
import { buildOutgoingRequest, type ApiRequest, type ApiResponse, type OutgoingRequest } from '#entities/request';
import { buildHostPattern, isHostCovered } from '#entities/site';
import { formatIssues } from '#shared/lib';
import { requestHostAccess, useHostPatterns } from '#shared/platform';

import { addHistoryEntry, buildHistoryEntry } from './historyEntries.ts';
import { buildApiRequest, type RequestDraft } from './requestDraft.ts';
import { resolveRequestVariables } from './requestVariables.ts';
import { IDLE_STATE, SENDING_STATE, SendStateTypes, type SendState } from './sendState.ts';

const ABORT_ERROR = 'AbortError';

const UNKNOWN_ERROR = 'unknown error';

const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === ABORT_ERROR;

/** A cancelled request leaves the tab as it was before sending */
const mapErrorToSendState = (error: unknown): SendState => {
    if (isAbortError(error)) {
        return IDLE_STATE;
    }

    if (error instanceof Error) {
        return {
            stateType: SendStateTypes.FAILED,
            reason: error.message,
        };
    }

    return {
        stateType: SendStateTypes.FAILED,
        reason: UNKNOWN_ERROR,
    };
};

const logHistoryFailure = (error: unknown) =>
    console.warn('[api-client] the request was not added to the history', error);

const saveToHistory = (typedRequest: ApiRequest, sentAt: number, response: NotRequired<ApiResponse>) => {
    addHistoryEntry(buildHistoryEntry(typedRequest, sentAt, response)).catch(logHistoryFailure);
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

        sendRequest(outgoing, controller.signal).then(onResponse).catch(onFailure);
    };

    const onRequestSend = (draft: RequestDraft, environment: NotRequired<Environment>) => {
        const tabId = draft.id;
        const typedRequest = buildApiRequest(draft);

        const { request, missingNames } = resolveRequestVariables(typedRequest, environment);

        if (missingNames.length > 0) {
            onSendStateChange(tabId, { stateType: SendStateTypes.MISSING_VARIABLES, names: missingNames });

            return;
        }

        const result = buildOutgoingRequest(request);

        if (!result.ok) {
            onSendStateChange(tabId, { stateType: SendStateTypes.INVALID, reason: formatIssues(result.issues) });

            return;
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
