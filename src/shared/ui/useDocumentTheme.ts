import { useEffect } from 'react';

export const useDocumentTheme = (theme: string) => {
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);
};
