import { useEffect, useEffectEvent } from 'react';

const SAVE_KEY = 's';

const isSaveShortcut = (event: KeyboardEvent): boolean =>
    (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === SAVE_KEY;

/** Ctrl+S, or Cmd+S on macOS, saves the request instead of the browser saving the page */
export const useSaveShortcut = (onSave: VoidFunction) => {
    const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
        if (!isSaveShortcut(event)) {
            return;
        }

        event.preventDefault();

        onSave();
    });

    useEffect(() => {
        const listener = (event: KeyboardEvent) => onKeyDown(event);

        window.addEventListener('keydown', listener);

        return () => window.removeEventListener('keydown', listener);
    }, []);
};
