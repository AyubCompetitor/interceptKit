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
import { useProcessAction } from '#shared/ui';

/** The environments, the chosen one and the changes the user makes to them */
export const useEnvironments = () => {
    const { isFailed: isActionFailed, processAction } = useProcessAction();

    const environments = useStorageItem(environmentsItem);
    const choice = useStorageItem(environmentChoiceItem);

    const isLoading = !environments || !choice;
    const activeEnvironment = findEnvironment(environments ?? [], choice?.activeId);

    const onEnvironmentChoose = (nextChoice: EnvironmentChoice) =>
        processAction(executeRpc(environmentsRpc.choose, nextChoice));

    const onEnvironmentDelete = (environment: Environment) =>
        processAction(executeRpc(environmentsRpc.remove, { id: environment.id }));

    return {
        environments: environments ?? [],
        activeEnvironment,

        isLoading,
        isActionFailed,

        onEnvironmentChoose,
        onEnvironmentDelete,
    };
};
