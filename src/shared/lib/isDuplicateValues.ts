/** True when some value occurs more than once */
export const isDuplicateValues = (values: readonly unknown[]): boolean => new Set(values).size !== values.length;
