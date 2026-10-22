import { json } from '@codemirror/lang-json';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from '@rstest/core';

import { findJsonErrorPosition } from '../codeEditorLint.ts';

const makeState = (doc: string) => EditorState.create({ doc, extensions: [json()] });

describe('findJsonErrorPosition', () => {
    it.each([
        { name: 'a trailing comma, which JSON.parse names no place for', doc: '{"users": [1, 2,]}', position: 16 },
        { name: 'a missing colon', doc: '{"a" 1}', position: 5 },
        { name: 'an unclosed object', doc: '{"a": 1', position: 7 },
    ])('finds $name', ({ doc, position }) => {
        expect(findJsonErrorPosition(makeState(doc))).toBe(position);
    });

    it('finds nothing in valid JSON', () => {
        expect(findJsonErrorPosition(makeState('{"users": [1, 2]}'))).toBeUndefined();
    });
});
