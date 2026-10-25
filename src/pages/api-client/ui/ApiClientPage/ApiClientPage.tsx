import type { FC } from 'react';

import { Features, isFeatureEnabled } from '#entities/config';
import { usePolicy } from '#features/policy';
import { useTranslation } from '#shared/i18n';
import { createDocumentTitle, useDocumentTitle } from '#shared/ui';

import { ApiClientDisabled } from './ApiClientDisabled.tsx';
import { ApiClientMain } from './ApiClientMain.tsx';

/** Nothing of the client starts before the policy is read: it may turn the client off */
export const ApiClientPage: FC = () => {
    const { t } = useTranslation();
    const { policy, isLoading } = usePolicy();

    const title = createDocumentTitle('apiClientTitle', 'extName', t);

    useDocumentTitle(title);

    if (isLoading) {
        return null;
    }

    if (!isFeatureEnabled(policy, Features.API_CLIENT)) {
        return <ApiClientDisabled />;
    }

    return <ApiClientMain />;
};
