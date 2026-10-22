import type { SubmitEvent } from 'react';

/** Send is the submit of the form, so Enter in the URL sends too */
export const useRequestFormSubmit = (onSend: VoidFunction) => {
    const onFormSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        onSend();
    };

    return {
        onFormSubmit,
    };
};
