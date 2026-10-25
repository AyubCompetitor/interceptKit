import type { ChangeEvent } from 'react';

import type { MockDraft, MockDraftChange } from '../model/mockDraft.ts';
import type { SyntaxType } from '../model/ruleDraft.ts';

import type { MockBodyType } from '#entities/mock';
import { toggleValue, type HttpMethod, type KeyValueRow } from '#shared/lib';

export const useMockDraftFields = (draft: MockDraft, onDraftChange: MockDraftChange) => {
    const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ name: event.target.value });
    };

    const onSyntaxChange = (syntaxType: SyntaxType) => {
        onDraftChange({ syntaxType });
    };

    const onPatternChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ pattern: event.target.value });
    };

    const onMethodToggle = (method: HttpMethod) => {
        onDraftChange({ methods: toggleValue(draft.methods, method) });
    };

    const onStatusChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ status: event.target.value });
    };

    const onDelayChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ delayMs: event.target.value });
    };

    const onBodyTypeChange = (bodyType: MockBodyType) => {
        onDraftChange({ bodyType });
    };

    const onBodyChange = (body: string) => {
        onDraftChange({ body });
    };

    const onHeadersChange = (headers: KeyValueRow[]) => {
        onDraftChange({ headers });
    };

    return {
        onNameChange,
        onSyntaxChange,
        onPatternChange,
        onMethodToggle,
        onStatusChange,
        onDelayChange,
        onBodyTypeChange,
        onBodyChange,
        onHeadersChange,
    };
};
