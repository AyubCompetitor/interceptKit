export const API_CLIENT_CONFIG = {
    /** Requests the history keeps, older ones are dropped */
    HISTORY_LIMIT: 100,
    /** Pause after the last edit before the open tabs are saved, in milliseconds */
    TABS_SAVE_DELAY_MS: 300,
    /** A request still without its whole response after this long is given up, in milliseconds */
    REQUEST_TIMEOUT_MS: 60_000,
    /** Bytes of a response body the page downloads; the rest stays on the server */
    MAX_RESPONSE_BYTES: 10 * 1024 * 1024,
} as const;
