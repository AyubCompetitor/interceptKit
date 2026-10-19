import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from './AppProviders.tsx';

export const mountPage = (page: ReactNode): void => {
    const container = document.getElementById('root');

    if (container === null) {
        throw new Error('#root element is missing');
    }

    createRoot(container).render(
        <StrictMode>
            <AppProviders>{page}</AppProviders>
        </StrictMode>,
    );
};
