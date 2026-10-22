import type { Mock } from './mock.ts';

export const upsertMock = (mocks: readonly Mock[], mock: Mock): Mock[] => {
    const index = mocks.findIndex(current => current.id === mock.id);

    if (index === -1) {
        return [...mocks, mock];
    }

    return mocks.with(index, mock);
};

export const removeMock = (mocks: readonly Mock[], id: string): Mock[] => mocks.filter(mock => mock.id !== id);
