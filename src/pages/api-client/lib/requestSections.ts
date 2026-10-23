export enum RequestSections {
    PARAMS = 'params',
    HEADERS = 'headers',
    BODY = 'body',
    SETTINGS = 'settings',
}

export type RequestSection = `${RequestSections}`;

export enum ResponseSections {
    BODY = 'body',
    HEADERS = 'headers',
}

export type ResponseSection = `${ResponseSections}`;
