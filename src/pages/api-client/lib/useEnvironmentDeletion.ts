import { useState } from 'react';

import type { Environment } from '#entities/environment';

export const useEnvironmentDeletion = (onEnvironmentDelete: (environment: Environment) => void) => {
    const [environmentToDelete, setEnvironmentToDelete] = useState<NotRequired<Environment>>();

    const onDeleteRequest = (environment: Environment) => {
        setEnvironmentToDelete(environment);
    };

    const onDeleteCancel = () => {
        setEnvironmentToDelete(undefined);
    };

    const onDeleteConfirm = () => {
        const isWaiting = environmentToDelete !== undefined;

        if (isWaiting) {
            onEnvironmentDelete(environmentToDelete);
        }

        setEnvironmentToDelete(undefined);
    };

    return {
        environmentToDelete,

        onDeleteRequest,
        onDeleteCancel,
        onDeleteConfirm,
    };
};
