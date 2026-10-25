/** What a file has that the API client cannot carry over */
export enum ImportGapTypes {
    SCRIPTS = 'scripts',
    EXAMPLES = 'examples',
    BODIES = 'bodies',
    BODIES_OF_BODYLESS = 'bodiesOfBodyless',
    AUTHS = 'auths',
    BASIC_WITH_VARIABLES = 'basicWithVariables',
    METHODS = 'methods',
    DYNAMIC_VARIABLES = 'dynamicVariables',
    DEEP_FOLDERS = 'deepFolders',
    VARIABLE_NAMES = 'variableNames',
    RELATIVE_SERVER = 'relativeServer',
    EXTERNAL_REFS = 'externalRefs',
    COOKIE_PARAMETERS = 'cookieParameters',
    OWN_SERVERS = 'ownServers',
}

export type ImportGapType = `${ImportGapTypes}`;

export interface ImportGap {
    /** What is left out */
    readonly gapType: ImportGapType;
    /** Kinds of it, such as the modes of bodies or the types of authorization, once each */
    readonly details: readonly string[];
    /** How many times the file has it */
    readonly count: number;
}

interface GapTally {
    /** Kinds seen so far */
    readonly details: Set<string>;
    /** Times seen so far */
    count: number;
}

/** Gaps in the order the file first shows them */
export type ImportGapTallies = Map<ImportGapType, GapTally>;

export const createGapTallies = (): ImportGapTallies => new Map();

export const addImportGap = (
    tallies: ImportGapTallies,
    gapType: ImportGapType,
    details: readonly string[] = [],
    count = 1,
): void => {
    const tally = tallies.get(gapType) ?? { details: new Set<string>(), count: 0 };

    tally.count += count;

    for (const detail of details) {
        tally.details.add(detail);
    }

    tallies.set(gapType, tally);
};

export const listImportGaps = (tallies: ImportGapTallies): ImportGap[] => {
    const gaps: ImportGap[] = [];

    for (const [gapType, tally] of tallies) {
        gaps.push({
            gapType,
            details: [...tally.details],
            count: tally.count,
        });
    }

    return gaps;
};
