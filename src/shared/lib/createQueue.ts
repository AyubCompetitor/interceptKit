export type TaskQueue = <T>(task: () => Promise<T>) => Promise<T>;

/** Runs async tasks one at a time */
export const createQueue = (): TaskQueue => {
    let tail: Promise<unknown> = Promise.resolve();

    return task => {
        const run = tail.then(task);

        tail = run.catch(() => undefined);

        return run;
    };
};
