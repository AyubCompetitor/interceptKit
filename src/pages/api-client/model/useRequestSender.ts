import { useRef } from 'react';

import { sendRequest } from '../api/sendRequest.ts';

import { buildOutgoingRequest, type OutgoingRequest } from '#entities/request';
import { buildHostPattern, isHostCovered } from '#entities/site';
import { formatIssues } from '#shared/lib';
import { requestHostAccess, useHostPatterns } from '#shared/platform';

import { buildApiRequest, type RequestDraft } from './requestDraft.ts';
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
        return { stateType: SendStateTypes.FAILED, reason: error.message };
    }

    return { stateType: SendStateTypes.FAILED, reason: UNKNOWN_ERROR };
};

/** Sends the requests of the tabs; access to a host is asked for inside the user's click, before anything else */
export const useRequestSender = (onSendStateChange: (tabId: string, sendState: SendState) => void) => {
    const patterns = useHostPatterns();
    const controllers = useRef(new Map<string, AbortController>());

    const sendOutgoing = (tabId: string, outgoing: OutgoingRequest) => {
        const controller = new AbortController();

        controllers.current.set(tabId, controller);

        onSendStateChange(tabId, SENDING_STATE);

        sendRequest(outgoing, controller.signal)
            .then(response => onSendStateChange(tabId, { stateType: SendStateTypes.RECEIVED, response }))
            .catch((error: unknown) => onSendStateChange(tabId, mapErrorToSendState(error)));
    };

    const onRequestSend = (draft: RequestDraft) => {
        const tabId = draft.id;
        const result = buildOutgoingRequest(buildApiRequest(draft));

        if (!result.ok) {
            onSendStateChange(tabId, { stateType: SendStateTypes.INVALID, reason: formatIssues(result.issues) });

            return;
        }

        const outgoing = result.value;
        const { hostname } = new URL(outgoing.url);
        const isCovered = patterns !== undefined && isHostCovered(hostname, patterns);

        if (isCovered) {
            sendOutgoing(tabId, outgoing);

            return;
        }

        const noAccessState: SendState = { stateType: SendStateTypes.NO_ACCESS, host: hostname };

        const applyAccessAnswer = (isGranted: boolean) => {
            if (!isGranted) {
                onSendStateChange(tabId, noAccessState);

                return;
            }

            sendOutgoing(tabId, outgoing);
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
