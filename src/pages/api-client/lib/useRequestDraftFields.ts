import type { ChangeEvent } from 'react';

import type { RequestDraft, RequestDraftChange } from '../model/requestDraft.ts';

import { isSendableMethod, type RequestBodyType } from '#entities/request';
import type { KeyValueRow } from '#shared/lib';

export const useRequestDraftFields = (draft: RequestDraft, onDraftChange: RequestDraftChange) => {
    const onMethodChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const method = event.target.value;

        if (isSendableMethod(method)) {
            onDraftChange({ method });
        }
    };

    const onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ url: event.target.value });
    };

    const onQueryChange = (query: KeyValueRow[]) => {
        onDraftChange({ query });
    };

    const onHeadersChange = (headers: KeyValueRow[]) => {
        onDraftChange({ headers });
    };

    const onBodyTypeChange = (bodyType: RequestBodyType) => {
        onDraftChange({ bodyType });
    };

    const onJsonBodyChange = (jsonBody: string) => {
        onDraftChange({ jsonBody });
    };

    const onRawBodyChange = (rawBody: string) => {
        onDraftChange({ rawBody });
    };

    const onRawContentTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
        onDraftChange({ rawContentType: event.target.value });
    };

    const onFormFieldsChange = (formFields: KeyValueRow[]) => {
        onDraftChange({ formFields });
    };

    const onSendCookiesToggle = () => {
        onDraftChange({ sendCookies: !draft.sendCookies });
    };

    return {
        onMethodChange,
        onUrlChange,
        onQueryChange,
        onHeadersChange,
        onBodyTypeChange,
        onJsonBodyChange,
        onRawBodyChange,
        onRawContentTypeChange,
        onFormFieldsChange,
        onSendCookiesToggle,
    };
};
