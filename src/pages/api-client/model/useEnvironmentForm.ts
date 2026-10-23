import { useState, type SubmitEvent } from 'react';

import { environmentsRpc, type Environment } from '#entities/environment';
import { executeRpc } from '#shared/messaging';

import { buildEnvironment, createEnvironmentDraft, type EnvironmentDraftPatch } from './environmentDraft.ts';

const UNKNOWN_ERROR = 'unknown error';

const getErrorText = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return UNKNOWN_ERROR;
};

export const useEnvironmentForm = (environment: NotRequired<Environment>, onSaved: VoidFunction) => {
    const [draft, setDraft] = useState(() => createEnvironmentDraft(environment));
    const [saveError, setSaveError] = useState<NotRequired<string>>();

    const onDraftChange = (patch: EnvironmentDraftPatch) => {
        setDraft(current => ({ ...current, ...patch }));
    };

    const onEnvironmentSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        executeRpc(environmentsRpc.save, buildEnvironment(draft))
            .then(() => onSaved())
            .catch((error: unknown) => setSaveError(getErrorText(error)));
    };

    return {
        draft,
        saveError,
        onDraftChange,
        onEnvironmentSubmit,
    };
};
