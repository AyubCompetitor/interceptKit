import { useEffect, useState } from 'react';

import { subscribeHostPatterns } from './permissions.ts';

export const useHostPatterns = () => {
    const [patterns, setPatterns] = useState<NotRequired<string[]>>();

    useEffect(() => subscribeHostPatterns(setPatterns), []);

    return patterns;
};
