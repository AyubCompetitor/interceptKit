import { useState, type SubmitEvent } from 'react';

import { mocksRpc, type Mock } from '#entities/mock';
import { getErrorText } from '#shared/lib';
import { executeRpc } from '#shared/messaging';

import { buildMock, createMockDraft, type MockDraftPatch } from './mockDraft.ts';

export const useMockForm = (mock: NotRequired<Mock>, onSaved: VoidFunction) => {
    const [draft, setDraft] = useState(() => createMockDraft(mock));
    const [saveError, setSaveError] = useState<NotRequired<string>>();

    const onDraftChange = (patch: MockDraftPatch) => {
        setDraft(current => ({ ...current, ...patch }));
    };

    const onMockSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        executeRpc(mocksRpc.save, buildMock(draft))
            .then(() => onSaved())
            .catch((error: unknown) => setSaveError(getErrorText(error)));
    };

    return {
        draft,
        saveError,
        onDraftChange,
        onMockSubmit,
    };
};
