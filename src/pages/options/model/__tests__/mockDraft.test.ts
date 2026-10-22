import { describe, expect, it } from '@rstest/core';

import { buildMock, createMockDraft, updateMockHeader, type MockHeaderDraft } from '../mockDraft.ts';

import { MockBodyTypes } from '#entities/mock';

import { DETAILED_MOCK, JSON_MOCK } from './mocks.ts';

const HEADER_ROWS: MockHeaderDraft[] = [
    { rowId: 'a', name: 'X-A', value: '1', enabled: true },
    { rowId: 'b', name: 'X-B', value: '2', enabled: true },
];

describe('mock drafts', () => {
    it.each([
        { name: 'a JSON mock', mock: JSON_MOCK },
        { name: 'a mock with methods, headers and a delay', mock: DETAILED_MOCK },
    ])('turn $name into a form and back unchanged', ({ mock }) => {
        expect(buildMock(createMockDraft(mock))).toEqual(mock);
    });

    it('start a new mock as an enabled JSON 200 with a fresh id', () => {
        const draft = createMockDraft(undefined);

        expect(draft).toMatchObject({ name: '', enabled: true, status: '200', bodyType: MockBodyTypes.JSON });

        expect(draft.id).not.toBe(createMockDraft(undefined).id);
    });

    it('show no delay as an empty field and read an empty field as no delay', () => {
        const draft = createMockDraft(JSON_MOCK);

        expect(draft.delayMs).toBe('');

        expect(buildMock(draft).response.delayMs).toBe(0);
    });

    it('trim the name, the pattern and header names', () => {
        const draft = {
            ...createMockDraft(JSON_MOCK),
            name: '  Users  ',
            pattern: ' ||api.example.com/ ',
            headers: [{ rowId: 'a', name: ' X-A ', value: ' 1 ', enabled: true }],
        };

        expect(buildMock(draft)).toMatchObject({
            name: 'Users',
            match: { url: { value: '||api.example.com/' } },
            response: { headers: [{ key: 'X-A', value: ' 1 ', enabled: true }] },
        });
    });

    it('leave out an empty choice of methods', () => {
        expect(buildMock(createMockDraft(JSON_MOCK)).match).not.toHaveProperty('methods');
    });
});

describe('updateMockHeader', () => {
    it('changes only the row with the id', () => {
        expect(updateMockHeader(HEADER_ROWS, 'b', { enabled: false })).toEqual([
            HEADER_ROWS[0],
            { ...HEADER_ROWS[1], enabled: false },
        ]);
    });
});
