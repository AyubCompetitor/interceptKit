/** Tunable numbers of the API client: change them here and nowhere else */
export const API_CLIENT_CONFIG = {
    /** Requests the history keeps; older ones are dropped */
    HISTORY_LIMIT: 100,
    /** Pause after the last edit before the open tabs are saved, in milliseconds */
    TABS_SAVE_DELAY_MS: 300,
} as const;
