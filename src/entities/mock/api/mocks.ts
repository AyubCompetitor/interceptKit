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

export const mocksRpc = {
    save: defineMethod<Mock, Mock>('mocks/save', mockValidator),
    remove: defineMethod<MockIdParams, void>('mocks/remove', object({ id: identifier })),
    forPage: defineMethod<null, PageMock[]>('mocks/forPage', nothing, [RpcCallers.CONTENT_SCRIPT]),
} as const;

export const MOCK_SCRIPTS: readonly ContentScriptSpec[] = [
    {
        id: 'xrequest-interceptor',
        file: 'content/interceptor.js',
        world: ScriptWorlds.MAIN,
    },
    {
        id: 'xrequest-bridge',
        file: 'content/bridge.js',
        world: ScriptWorlds.ISOLATED,
    },
];
