import { useState } from 'react';

/** Which part of an editor is on the screen; the choice stays when the tab changes */
export const useSectionChoice = <T extends string>(initialSection: T) => {
    const [section, setSection] = useState<T>(initialSection);

    const onSectionChange = (nextSection: T) => {
        setSection(nextSection);
    };

    return {
        section,

        onSectionChange,
    };
};
