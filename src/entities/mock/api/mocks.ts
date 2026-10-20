import { mocksValidator, type Mock } from '../model/mock.ts';

import { defineStoreItem, Stores } from '#shared/lib';

export const mocksItem = defineStoreItem<readonly Mock[]>({
    key: 'mocks',
    area: Stores.LOCAL,
    fallback: [],
    validator: mocksValidator,
});
