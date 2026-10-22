import { mocksValidator, mockValidator, type Mock } from '../model/mock.ts';
import type { PageMock } from '../model/pageMock.ts';

import {
    defineMethod,
    defineStoreItem,
    identifier,
    nothing,
    object,
    RpcCallers,
    ScriptWorlds,
    Stores,
    type ContentScriptSpec,
} from '#shared/lib';

export interface MockIdParams {
    /** Id of the mock */
    readonly id: string;
}

export const mocksItem = defineStoreItem<readonly Mock[]>({
    key: 'mocks',
    area: Stores.LOCAL,
    fallback: [],
    validator: mocksValidator,
});

/** Mocks are written only by the background; pages of mock sites ask for theirs through the bridge */
export const mocksRpc = {
    save: defineMethod<Mock, Mock>('mocks/save', mockValidator),
    remove: defineMethod<MockIdParams, void>('mocks/remove', object({ id: identifier })),
    /** The site is the sender's origin as the browser reports it, so a page cannot ask for another site's mocks */
    forPage: defineMethod<null, PageMock[]>('mocks/forPage', nothing, [RpcCallers.CONTENT_SCRIPT]),
} as const;

/** The bridge posts the mocks only after a round trip to the background, when the interceptor listens already */
export const MOCK_SCRIPTS: readonly ContentScriptSpec[] = [
    {
        id: 'interceptkit-interceptor',
        file: 'content/interceptor.js',
        world: ScriptWorlds.MAIN,
    },
    {
        id: 'interceptkit-bridge',
        file: 'content/bridge.js',
        world: ScriptWorlds.ISOLATED,
    },
];
