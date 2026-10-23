import { environmentChoiceItem, environmentsItem, findEnvironment } from '#entities/environment';
import { useStorageItem } from '#shared/platform';

export const useActiveEnvironment = () => {
    const environments = useStorageItem(environmentsItem);
    const choice = useStorageItem(environmentChoiceItem);

    return findEnvironment(environments ?? [], choice?.activeId);
};
