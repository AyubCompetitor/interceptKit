import { useState } from 'react';

import {
    environmentChoiceItem,
    environmentsItem,
    environmentsRpc,
    findEnvironment,
    type Environment,
    type EnvironmentChoice,
} from '#entities/environment';
import { executeRpc } from '#shared/messaging';
import { useStorageItem } from '#shared/platform';

/** The environments, the chosen one and the changes the user makes to them */
export const useEnvironments = () => {
    const [isActionFailed, setIsActionFailed] = useState(false);

    const environments = useStorageItem(environmentsItem);
    const choice = useStorageItem(environmentChoiceItem);

    const isLoading = !environments || !choice;
    const activeEnvironment = findEnvironment(environments ?? [], choice?.activeId);

    const onEnvironmentChoose = (nextChoice: EnvironmentChoice) => {
        executeRpc(environmentsRpc.choose, nextChoice)
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    const onEnvironmentDelete = (environment: Environment) => {
        executeRpc(environmentsRpc.remove, { id: environment.id })
            .then(() => setIsActionFailed(false))
            .catch(() => setIsActionFailed(true));
    };

    return {
        environments: environments ?? [],
        activeEnvironment,

        isLoading,
        isActionFailed,

        onEnvironmentChoose,
        onEnvironmentDelete,
    };
};
