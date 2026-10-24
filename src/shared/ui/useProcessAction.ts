import { useState } from 'react';

export const useProcessAction = () => {
    const [isFailed, setIsFailed] = useState(false);

    const processAction = (action: Promise<unknown>) => {
        action.then(() => setIsFailed(false)).catch(() => setIsFailed(true));
    };

    return {
        isFailed,
        processAction,
    };
};
