import type { RequestDraft } from '../../model/requestDraft.ts';

const HTTP_SCHEME_RGX = /^https?:\/\//i;

/** The URL without its scheme; nothing while the URL is empty */
export const getRequestTabTitle = (draft: RequestDraft): NotRequired<string> => {
    const url = draft.url.trim();

    if (url === '') {
        return;
    }

    return url.replace(HTTP_SCHEME_RGX, '');
};
