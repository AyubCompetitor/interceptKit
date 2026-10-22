import type { ChangeEvent } from 'react';

import type { EnvironmentChoice } from '#entities/environment';

/** Value of the option for requests without variables */
export const NO_ENVIRONMENT = '';

/** Turns the option of the select into a choice of environment */
export const useEnvironmentSelect = (onEnvironmentChoose: (choice: EnvironmentChoice) => void) => {
    const onChoiceChange = (event: ChangeEvent<HTMLSelectElement>) => {
        const activeId = event.target.value;

        if (activeId === NO_ENVIRONMENT) {
            onEnvironmentChoose({});

            return;
        }

        onEnvironmentChoose({ activeId });
    };

    return {
        onChoiceChange,
    };
};
