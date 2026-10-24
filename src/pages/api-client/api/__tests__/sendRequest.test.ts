import { describe, expect, it } from '@rstest/core';

import { readLimitedBody } from '../sendRequest.ts';

const LIMIT = 8;

const textEncoder = new TextEncoder();

/** A response whose body arrives in the given chunks, the way the network hands it over */
const makeStreamedResponse = (chunks: readonly string[]) => {
    const stream = new ReadableStream<Uint8Array>({
        start: controller => {
            for (const chunk of chunks) {
                controller.enqueue(textEncoder.encode(chunk));
            }

            controller.close();
        },
    });

    return new Response(stream);
};

const readText = async (chunks: readonly string[]) => {
    const { buffer, isTruncated } = await readLimitedBody(makeStreamedResponse(chunks), LIMIT);

    return {
        text: new TextDecoder().decode(buffer),
        isTruncated,
    };
};

describe('readLimitedBody', () => {
    it.each([
        { name: 'a body under the limit', chunks: ['abc', 'def'], text: 'abcdef', isTruncated: false },
        { name: 'a body of exactly the limit', chunks: ['abcd', 'efgh'], text: 'abcdefgh', isTruncated: false },
        { name: 'a body past the limit', chunks: ['abcde', 'fghij', 'klm'], text: 'abcdefgh', isTruncated: true },
    ])('reads $name', async ({ chunks, text, isTruncated }) => {
        expect(await readText(chunks)).toEqual({ text, isTruncated });
    });

    it('reads a response without a body as empty', async () => {
        const { buffer, isTruncated } = await readLimitedBody(new Response(null, { status: 204 }), LIMIT);

        expect(buffer.byteLength).toBe(0);

        expect(isTruncated).toBe(false);
    });
});
