import { environmentsItem } from '#entities/environment';
import { mocksItem } from '#entities/mock';
import { rulesItem } from '#entities/rule';
import type { BundleContent } from '#features/transfer';
import { useStorageItem } from '#shared/platform';

export const useStoredBundle = () => {
    const rules = useStorageItem(rulesItem);
    const mocks = useStorageItem(mocksItem);
    const environments = useStorageItem(environmentsItem);

    const isLoading = !rules || !mocks || !environments;

    const content: BundleContent = {
        rules: rules ?? [],
        mocks: mocks ?? [],
        environments: environments ?? [],
    };

    return {
        content,
        isLoading,
    };
};
