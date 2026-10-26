import { useRef, type UIEvent } from 'react';

/** A long value scrolls inside the input, and the copy behind it scrolls the same way */
export const useMirrorScroll = () => {
    const mirrorRef = useRef<HTMLSpanElement>(null);

    const onInputScroll = (event: UIEvent<HTMLInputElement>) => {
        if (!mirrorRef.current) {
            return;
        }

        mirrorRef.current.scrollLeft = event.currentTarget.scrollLeft;
    };

    return {
        mirrorRef,
        onInputScroll,
    };
};
