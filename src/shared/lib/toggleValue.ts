/** Adds the value when it is missing and removes it when it is there */
export const toggleValue = <T>(values: readonly T[], value: T): T[] => {
    if (values.includes(value)) {
        return values.filter(current => current !== value);
    }

    return [...values, value];
};
