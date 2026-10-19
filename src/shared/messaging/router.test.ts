import { describe, expect, it } from '@rstest/core';

import { defineMethod, nothing, number, object, RpcCallers } from '#shared/lib';

import { createRouter, type Router } from './router.ts';

interface PairParams {
    /** First operand. */
    a: number;
    /** Second operand. */
    b: number;
}

const EXTENSION_ID = 'abcdefghijklmnopabcdefghijklmnop';
const EXTENSION_PAGE = { id: EXTENSION_ID, origin: `chrome-extension://${EXTENSION_ID}` };
const CONTENT_SCRIPT = { id: EXTENSION_ID, origin: 'https://app.example.com', tab: { id: 7 } };

const pairParams = object({ a: number(), b: number() });

const addMethod = defineMethod<PairParams, number>('math/add', pairParams);

const pingMethod = defineMethod<PairParams, string>('bridge/ping', pairParams, [RpcCallers.CONTENT_SCRIPT]);

const createTestRouter = (): Router => {
    const router = createRouter({ extensionId: EXTENSION_ID });

    router.handle(addMethod, ({ a, b }) => a + b);
    router.handle(pingMethod, (_params, context) => context.origin);

    return router;
};

const createRequest = (method: string, params?: unknown) => ({ ik: 1, method, params });

describe('router', () => {
    it('runs a handler for an allowed caller with valid params', async () => {
        const request = createRequest('math/add', { a: 2, b: 3 });

        expect(await createTestRouter().dispatch(request, EXTENSION_PAGE)).toEqual({ ok: true, result: 5 });
    });

    it('ignores messages that are not ours', async () => {
        expect(await createTestRouter().dispatch({ type: 'other' }, EXTENSION_PAGE)).toBeUndefined();
    });

    it('rejects senders from other extensions and unknown origins', async () => {
        const router = createTestRouter();
        const request = createRequest('math/add', { a: 1, b: 1 });
        const foreign = { id: 'other', origin: 'chrome-extension://other' };
        const noOrigin = { id: EXTENSION_ID };

        expect(await router.dispatch(request, foreign)).toMatchObject({ ok: false, error: { code: 'forbidden' } });

        expect(await router.dispatch(request, noOrigin)).toMatchObject({ ok: false, error: { code: 'forbidden' } });
    });

    it('keeps content scripts away from extension-only methods', async () => {
        const request = createRequest('math/add', { a: 1, b: 1 });

        expect(await createTestRouter().dispatch(request, CONTENT_SCRIPT)).toMatchObject({
            ok: false,
            error: { code: 'forbidden' },
        });
    });

    it('gives content-script handlers the browser-reported origin', async () => {
        const request = createRequest('bridge/ping', { a: 1, b: 1 });

        expect(await createTestRouter().dispatch(request, CONTENT_SCRIPT)).toEqual({
            ok: true,
            result: 'https://app.example.com',
        });
    });

    it('validates params before the handler runs', async () => {
        const request = createRequest('math/add', { a: '1', b: 1 });

        expect(await createTestRouter().dispatch(request, EXTENSION_PAGE)).toMatchObject({
            ok: false,
            error: { code: 'bad_request' },
        });
    });

    it('reports unknown methods and hides handler errors', async () => {
        const router = createTestRouter();
        const boomMethod = defineMethod<null, never>('boom', nothing);

        expect(await router.dispatch(createRequest('math/sub'), EXTENSION_PAGE)).toMatchObject({
            ok: false,
            error: { code: 'unknown_method' },
        });

        router.handle(boomMethod, () => {
            throw new Error('secret details');
        });

        expect(await router.dispatch(createRequest('boom'), EXTENSION_PAGE)).toEqual({
            ok: false,
            error: { code: 'internal', message: 'internal error' },
        });
    });

    it('refuses duplicate handlers', () => {
        expect(() => createTestRouter().handle(addMethod, () => 0)).toThrow();
    });
});
