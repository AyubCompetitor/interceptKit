const UNKNOWN_ERROR = 'unknown error';

/** The message of an error for the UI, in English as the code wrote it */
export const getErrorText = (error: unknown): string => {
    if (!(error instanceof Error)) {
        return UNKNOWN_ERROR;
    }

    return error.message;
};
