import type { ApiResponse } from '#entities/request';

/** Where the request of a tab stands */
export enum SendStateTypes {
    /** Not sent yet, or cancelled */
    IDLE = 'idle',
    /** Waiting for the response */
    SENDING = 'sending',
    /** The response arrived */
    RECEIVED = 'received',
    /** The request cannot go as typed */
    INVALID = 'invalid',
    /** The request went, but no response came back */
    FAILED = 'failed',
    /** The user refused access to the host */
    NO_ACCESS = 'noAccess',
}

export type SendStateType = `${SendStateTypes}`;

interface IdleState {
    /** Not sent yet */
    readonly stateType: SendStateTypes.IDLE;
}

interface SendingState {
    /** Waiting for the response */
    readonly stateType: SendStateTypes.SENDING;
}

interface ReceivedState {
    /** The response arrived */
    readonly stateType: SendStateTypes.RECEIVED;
    /** What came back */
    readonly response: ApiResponse;
}

interface InvalidState {
    /** The request cannot go as typed */
    readonly stateType: SendStateTypes.INVALID;
    /** Technical reason, in English */
    readonly reason: string;
}

interface FailedState {
    /** No response came back */
    readonly stateType: SendStateTypes.FAILED;
    /** What the browser reported */
    readonly reason: string;
}

interface NoAccessState {
    /** The user refused access to the host */
    readonly stateType: SendStateTypes.NO_ACCESS;
    /** Host the request goes to */
    readonly host: string;
}

export type SendState = IdleState | SendingState | ReceivedState | InvalidState | FailedState | NoAccessState;

export const IDLE_STATE: SendState = { stateType: SendStateTypes.IDLE };

export const SENDING_STATE: SendState = { stateType: SendStateTypes.SENDING };
