import { mocksValidator, type Mock } from '../model/mock.ts';

import { defineStore, Stores } from '#shared/lib';

export const mocksItem = defineStore<readonly Mock[]>({
    key: 'mocks',
    area: Stores.LOCAL,
    fallback: [],
    validator: mocksValidator,
});
