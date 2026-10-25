import { readPolicy } from '#entities/config';
import { Stores } from '#shared/lib';
import { useStoreData } from '#shared/platform';

export const usePolicy = () => {
    const managedData = useStoreData(Stores.MANAGED);
    const isLoading = !managedData;

    const { policy, issues } = readPolicy(managedData);

    return {
        policy,
        issues,
        isLoading,
    };
};
