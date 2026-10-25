import { environmentsItem } from '#entities/environment';
import { mocksItem } from '#entities/mock';
import { apiClientDatabase, collectionsStore } from '#entities/request';
import { rulesItem } from '#entities/rule';
import type { BundleContent } from '#features/transfer';
import { useDatabaseRecords, useStorageItem } from '#shared/platform';

export const useStoredBundle = () => {
    const rules = useStorageItem(rulesItem);
    const mocks = useStorageItem(mocksItem);
    const environments = useStorageItem(environmentsItem);
    const collections = useDatabaseRecords(apiClientDatabase, collectionsStore);

    const isLoading = !rules || !mocks || !environments || !collections;

    const content: BundleContent = {
        rules: rules ?? [],
        mocks: mocks ?? [],
        environments: environments ?? [],
        collections: collections ?? [],
    };

    return {
        content,
        isLoading,
    };
};
