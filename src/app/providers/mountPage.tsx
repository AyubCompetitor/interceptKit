import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from './AppProviders.tsx';

const ROOT_MISSING_ERROR = '#root element is missing';

export const mountPage = (page: ReactNode): void => {
    const container = document.getElementById('root');

    if (container === null) {
        throw new Error(ROOT_MISSING_ERROR);
    }

    createRoot(container).render(
        <StrictMode>
            <AppProviders>{page}</AppProviders>
        </StrictMode>,
    );
};
