/** Where a content script runs */
export enum ScriptWorlds {
    /** Shared with the page own scripts, without extension APIs */
    MAIN = 'MAIN',
    /** The extension own world on the page, with runtime messaging */
    ISOLATED = 'ISOLATED',
}

export type ScriptWorld = `${ScriptWorlds}`;

/** A content script the extension registers at run time */
export interface ContentScriptSpec {
    /** Unique id of the registration */
    readonly id: string;
    /** Built file, relative to the extension root */
    readonly file: string;
    /** Where the script runs */
    readonly world: ScriptWorld;
}
