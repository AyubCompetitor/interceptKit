/** Parts of the request editor, one on the screen at a time */
export enum RequestSections {
    PARAMS = 'params',
    HEADERS = 'headers',
    BODY = 'body',
    SETTINGS = 'settings',
}

export type RequestSection = `${RequestSections}`;

/** Parts of a received response, one on the screen at a time */
export enum ResponseSections {
    BODY = 'body',
    HEADERS = 'headers',
}

export type ResponseSection = `${ResponseSections}`;
