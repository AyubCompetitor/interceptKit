import { afterEach, describe, expect, it, rs } from '@rstest/core';

import { defineMethod, nothing } from '#shared/lib';

import { RpcError, RpcErrorCodes } from '../protocol.ts';
import { createRouter, type Router } from '../router.ts';

import { addMethod, CONTENT_SCRIPT, EXTENSION_ID, EXTENSION_PAGE, makeRequest, pingMethod } from './mocks.ts';

const createTestRouter = (): Router => {
    const router = createRouter({ extensionId: EXTENSION_ID });

    router.on(addMethod, ({ a, b }) => a + b);
    router.on(pingMethod, (_params, context) => context.origin);

    return router;
};

afterEach(() => {
    rs.restoreAllMocks();
});

describe('createRouter', () => {
    describe('dispatch', () => {
        it('runs a handler for an allowed caller with valid params', async () => {
            const request = makeRequest('math/add', { a: 2, b: 3 });

            expect(await createTestRouter().dispatch(request, EXTENSION_PAGE)).toEqual({ ok: true, result: 5 });
        });

        it('ignores messages that are not ours', async () => {
            expect(await createTestRouter().dispatch({ type: 'other' }, EXTENSION_PAGE)).toBeUndefined();
        });

        it('validates params before the handler runs', async () => {
            const request = makeRequest('math/add', { a: '1', b: 1 });

            expect(await createTestRouter().dispatch(request, EXTENSION_PAGE)).toMatchObject({
                ok: false,
                error: {
                    code: 'bad_request',
                },
            });
        });

        it('reports unknown methods', async () => {
            expect(await createTestRouter().dispatch(makeRequest('math/sub'), EXTENSION_PAGE)).toMatchObject({
                ok: false,
                error: {
                    code: 'unknown_method',
                },
            });
        });

        it('passes a deliberate RpcError to the caller', async () => {
            const router = createTestRouter();

            router.on(defineMethod<null, never>('refuse', nothing), () => {
                throw new RpcError(RpcErrorCodes.BAD_REQUEST, 'unsupported regex');
            });

            expect(await router.dispatch(makeRequest('refuse'), EXTENSION_PAGE)).toEqual({
                ok: false,
                error: {
                    code: 'bad_request',
                    message: 'unsupported regex',
                },
            });
        });

        it('hides handler errors from the caller', async () => {
            rs.spyOn(console, 'error').mockImplementation(() => undefined);

            const router = createTestRouter();

            router.on(defineMethod<null, never>('boom', nothing), () => {
                throw new Error('secret details');
            });

            expect(await router.dispatch(makeRequest('boom'), EXTENSION_PAGE)).toEqual({
                ok: false,
                error: {
                    code: 'internal',
                    message: 'internal error',
                },
            });
        });
    });

    describe('sender checks', () => {
        it.each([
            { name: 'another extension', sender: { id: 'other', origin: 'chrome-extension://other' } },
            { name: 'a sender without origin', sender: { id: EXTENSION_ID } },
        ])('rejects $name', async ({ sender }) => {
            const request = makeRequest('math/add', { a: 1, b: 1 });

            expect(await createTestRouter().dispatch(request, sender)).toMatchObject({
                ok: false,
                error: {
                    code: 'forbidden',
                },
            });
        });

        it('keeps content scripts away from extension-only methods', async () => {
            const request = makeRequest('math/add', { a: 1, b: 1 });

            expect(await createTestRouter().dispatch(request, CONTENT_SCRIPT)).toMatchObject({
                ok: false,
                error: {
                    code: 'forbidden',
                },
            });
        });

        it('gives content-script handlers the browser-reported origin', async () => {
            const request = makeRequest('bridge/ping', { a: 1, b: 1 });

            expect(await createTestRouter().dispatch(request, CONTENT_SCRIPT)).toEqual({
                ok: true,
                result: 'https://app.example.com',
            });
        });
    });

    describe('on', () => {
        it('refuses duplicate handlers', () => {
            expect(() => createTestRouter().on(addMethod, () => 0)).toThrow();
        });
    });
});
