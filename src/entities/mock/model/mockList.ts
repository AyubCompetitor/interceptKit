import type { Mock } from './mock.ts';

export const upsertMock = (mocks: readonly Mock[], mock: Mock): Mock[] => {
    const idx = mocks.findIndex(current => current.id === mock.id);

    if (idx === -1) {
        return [...mocks, mock];
    }

    return mocks.with(idx, mock);
};

export const removeMock = (mocks: readonly Mock[], id: string): Mock[] => mocks.filter(mock => mock.id !== id);
