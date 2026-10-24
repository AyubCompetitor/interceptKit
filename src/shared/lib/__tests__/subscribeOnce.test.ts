import { describe, expect, it, rs } from '@rstest/core';

import { subscribeOnce } from '../subscribeOnce.ts';

const FALLBACK = 'fallback';

/** A timer runs after every pending promise callback */
const flushAnswers = () => new Promise(resolve => setTimeout(resolve));

describe('subscribeOnce', () => {
    it('hands over the answer', async () => {
        const listener = rs.fn();

        subscribeOnce(Promise.resolve('answer'), FALLBACK, listener);

        await flushAnswers();

        expect(listener.mock.calls).toEqual([['answer']]);
    });

    it('hands over the fallback when the answer fails', async () => {
        const listener = rs.fn();

        subscribeOnce(Promise.reject(new Error('broken')), FALLBACK, listener);

        await flushAnswers();

        expect(listener.mock.calls).toEqual([[FALLBACK]]);
    });

    it('drops an answer that comes after the stop', async () => {
        const listener = rs.fn();

        const stop = subscribeOnce(Promise.resolve('late'), FALLBACK, listener);

        stop();

        await flushAnswers();

        expect(listener).not.toHaveBeenCalled();
    });
});
