import { useState, type SubmitEvent } from 'react';

import { environmentsRpc, type Environment } from '#entities/environment';
import { executeRpc, RpcError, RpcErrorCodes } from '#shared/messaging';

import { buildEnvironment, createEnvironmentDraft, type EnvironmentDraftPatch } from './environmentDraft.ts';

const UNKNOWN_ERROR = 'unknown error';

const getErrorText = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return UNKNOWN_ERROR;
};

/** The background refuses to store a typed secret while the vault is locked */
const isVaultLockedError = (error: unknown): boolean =>
    error instanceof RpcError && error.code === RpcErrorCodes.FORBIDDEN;

export const useEnvironmentForm = (environment: NotRequired<Environment>, onSaved: VoidFunction) => {
    const [draft, setDraft] = useState(() => createEnvironmentDraft(environment));
    const [saveError, setSaveError] = useState<NotRequired<string>>();
    const [isVaultLocked, setIsVaultLocked] = useState(false);

    const applySaveError = (error: unknown) => {
        if (isVaultLockedError(error)) {
            setSaveError(undefined);
            setIsVaultLocked(true);

            return;
        }

        setIsVaultLocked(false);
        setSaveError(getErrorText(error));
    };

    const onDraftChange = (patch: EnvironmentDraftPatch) => {
        setDraft(current => ({ ...current, ...patch }));
    };

    const onEnvironmentSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        executeRpc(environmentsRpc.save, buildEnvironment(draft))
            .then(() => onSaved())
            .catch(applySaveError);
    };

    return {
        draft,
        saveError,
        isVaultLocked,
        onDraftChange,
        onEnvironmentSubmit,
    };
};
