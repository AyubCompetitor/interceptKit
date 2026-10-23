const ABORT_EVENT = 'abort';

export const waitForMockDelay = (delayMs: number, signal: NotRequired<AbortSignal>): Promise<void> => {
    signal?.throwIfAborted();

    const delay = Promise.withResolvers<void>();

    const timer = window.setTimeout(delay.resolve, delayMs);

    const onAbort: VoidFunction = () => {
        window.clearTimeout(timer);

        delay.reject(signal?.reason);
    };

    signal?.addEventListener(ABORT_EVENT, onAbort, { once: true });

    return delay.promise;
};
