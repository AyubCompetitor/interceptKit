import { environmentChoiceItem, environmentsItem, findEnvironment } from '#entities/environment';
import { useStorageItem } from '#shared/platform';

/** The environment whose variables fill the requests; none until one is chosen */
export const useActiveEnvironment = () => {
    const environments = useStorageItem(environmentsItem);
    const choice = useStorageItem(environmentChoiceItem);

    return findEnvironment(environments ?? [], choice?.activeId);
};
