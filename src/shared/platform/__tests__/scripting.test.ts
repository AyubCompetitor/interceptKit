import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';

import { ScriptWorlds, type ContentScriptSpec } from '#shared/lib';

import { syncContentScripts } from '../scripting/scripting.ts';

import { installFakeScripting, type FakeScripting } from './mocks.ts';

const SPECS: ContentScriptSpec[] = [
    { id: 'main', file: 'content/main.js', world: ScriptWorlds.MAIN },
    { id: 'isolated', file: 'content/isolated.js', world: ScriptWorlds.ISOLATED },
];

const PATTERNS = ['*://*.example.com/*'];

const OTHER_PATTERNS = ['*://*.example.com/*', '*://other.test/*'];

describe('syncContentScripts', () => {
    let scripting: FakeScripting;

    beforeEach(() => {
        scripting = installFakeScripting();
    });

    afterEach(() => {
        rs.restoreAllMocks();
    });

    it('registers every script on the patterns before page scripts, in every frame', async () => {
        await syncContentScripts(SPECS, PATTERNS);

        expect(scripting.registered).toEqual([
            {
                id: 'main',
                js: ['content/main.js'],
                world: ScriptWorlds.MAIN,
                matches: PATTERNS,
                runAt: 'document_start',
                allFrames: true,
                persistAcrossSessions: true,
            },
            {
                id: 'isolated',
                js: ['content/isolated.js'],
                world: ScriptWorlds.ISOLATED,
                matches: PATTERNS,
                runAt: 'document_start',
                allFrames: true,
                persistAcrossSessions: true,
            },
        ]);
    });

    it('leaves a current registration alone', async () => {
        await syncContentScripts(SPECS, PATTERNS);

        const register = rs.spyOn(scripting.api, 'registerContentScripts');

        await syncContentScripts(SPECS, PATTERNS);

        expect(register).not.toHaveBeenCalled();
    });

    it.each([
        { name: 'other patterns', specs: SPECS, patterns: OTHER_PATTERNS },
        { name: 'another file', specs: [{ ...SPECS[0]!, file: 'content/new.js' }, SPECS[1]!], patterns: PATTERNS },
    ])('registers again for $name', async ({ specs, patterns }) => {
        await syncContentScripts(SPECS, PATTERNS);

        await syncContentScripts(specs, patterns);

        expect(scripting.registered.map(script => [script.js, script.matches])).toEqual(
            specs.map(spec => [[spec.file], patterns]),
        );
    });

    it('unregisters every script when no pattern is left', async () => {
        await syncContentScripts(SPECS, PATTERNS);

        await syncContentScripts(SPECS, []);

        expect(scripting.registered).toEqual([]);
    });
});
