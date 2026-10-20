import { describe, expect, it } from '@rstest/core';

import { createQueue } from '../createQueue.ts';

const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 1));

describe('createQueue', () => {
    it('runs read-modify-write tasks without lost updates', async () => {
        const queue = createQueue();

        let stored = 0;

        const increment = (): Promise<void> =>
            queue(async () => {
                const current = stored;

                await tick();
                stored = current + 1;
            });

        await Promise.all(Array.from({ length: 3 }, () => increment()));

        expect(stored).toBe(3);
    });

    it('keeps going after a failed task', async () => {
        const queue = createQueue();

        await expect(queue(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');

        await expect(queue(() => Promise.resolve('next'))).resolves.toBe('next');
    });
});
