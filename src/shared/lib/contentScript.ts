/** Where a content script runs */
export enum ScriptWorlds {
    /** Shared with the page's own scripts, without extension APIs */
    MAIN = 'MAIN',
    /** The extension's own world on the page, with runtime messaging */
    ISOLATED = 'ISOLATED',
}

export type ScriptWorld = `${ScriptWorlds}`;

/** A content script the extension registers at run time; shared/platform executes it */
export interface ContentScriptSpec {
    /** Unique id of the registration */
    readonly id: string;
    /** Built file, relative to the extension root */
    readonly file: string;
    /** Where the script runs */
    readonly world: ScriptWorld;
}
