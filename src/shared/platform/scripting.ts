import type { ContentScriptSpec } from '#shared/lib';

type RegisteredScript = chrome.scripting.RegisteredContentScript;

/** Content scripts of this extension run before page scripts, in every frame the patterns cover */
const mapSpecToScript = (spec: ContentScriptSpec, matches: readonly string[]): RegisteredScript => ({
    id: spec.id,
    js: [spec.file],
    world: spec.world,
    matches: [...matches],
    runAt: 'document_start',
    allFrames: true,
    persistAcrossSessions: true,
});

const isSameList = (left: readonly string[], right: readonly string[]): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);

/** The same file in the same world on the same patterns: an update may change any of them */
const isScriptCurrent = (script: RegisteredScript, spec: ContentScriptSpec, matches: readonly string[]): boolean => {
    const isSameFile = isSameList(script.js ?? [], [spec.file]);
    const isSameWorld = script.world === spec.world;

    return isSameFile && isSameWorld && isSameList(script.matches ?? [], matches);
};

const isRegistrationCurrent = (
    registered: readonly RegisteredScript[],
    specs: readonly ContentScriptSpec[],
    matches: readonly string[],
): boolean => {
    return specs.every(spec => {
        const script = registered.find(current => current.id === spec.id);

        return script !== undefined && isScriptCurrent(script, spec, matches);
    });
};

/**
 * Registers the scripts on the given patterns, or unregisters them for none. A registration
 * that is already current is left alone, so pages loading meanwhile never miss a script.
 */
export const syncContentScripts = async (
    specs: readonly ContentScriptSpec[],
    matches: readonly string[],
): Promise<void> => {
    const ids = specs.map(spec => spec.id);
    const registered = await chrome.scripting.getRegisteredContentScripts({ ids });
    const isEmpty = matches.length === 0;

    if (isEmpty && registered.length === 0) {
        return;
    }

    if (!isEmpty && isRegistrationCurrent(registered, specs, matches)) {
        return;
    }

    if (registered.length > 0) {
        await chrome.scripting.unregisterContentScripts({ ids: registered.map(script => script.id) });
    }

    if (isEmpty) {
        return;
    }

    await chrome.scripting.registerContentScripts(specs.map(spec => mapSpecToScript(spec, matches)));
};
