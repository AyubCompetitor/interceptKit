export const subscribeOnce = <T>(answer: Promise<T>, fallback: T, listener: (value: T) => void): VoidFunction => {
    let isSubscribed = true;

    const updateValue = (value: T) => {
        if (!isSubscribed) {
            return;
        }

        listener(value);
    };

    answer.then(updateValue).catch(() => updateValue(fallback));

    return () => {
        isSubscribed = false;
    };
};
