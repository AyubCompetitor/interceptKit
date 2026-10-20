import { useEffect } from 'react';

import type { MessageKey, TFunction } from '#shared/i18n';

export const createDocumentTitle = (title: MessageKey, subtitle: MessageKey, t: TFunction): string =>
    `${t(title)}: ${t(subtitle)}`;

export const useDocumentTitle = (title: string) => {
    useEffect(() => {
        document.title = title;
    }, [title]);
};
