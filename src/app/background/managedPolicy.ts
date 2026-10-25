import { readPolicy, type ManagedPolicy } from '#entities/config';
import { Stores } from '#shared/lib';
import { readStoreData } from '#shared/platform';

export const readManagedPolicy = async (): Promise<ManagedPolicy> => {
    const managedData = await readStoreData(Stores.MANAGED);
    const { policy } = readPolicy(managedData);

    return policy;
};
