/** A problem found in untrusted input */
export interface Issue {
    /** Where the problem is */
    readonly path: string;
    /** What is wrong */
    readonly message: string;
}

interface ValidResult<T> {
    /** Validation passed */
    readonly ok: true;
    /** The validated value */
    readonly value: T;
}

interface InvalidResult {
    /** Validation failed. */
    readonly ok: false;
    /** Every problem found. */
    readonly issues: readonly Issue[];
}

export type Result<T> = ValidResult<T> | InvalidResult;

/** Checks untrusted input */
export type Validator<T> = (input: unknown, path: string) => Result<T>;

export type Infer<V> = V extends Validator<infer T> ? T : never;

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = (path: string, message: string): Result<never> => ({ ok: false, issues: [{ path, message }] });

/** Runs a validator on a root value */
export const validate = <T>(validator: Validator<T>, input: unknown): Result<T> => validator(input, '$');

export const formatIssues = (issues: readonly Issue[]): string =>
    issues.map(issue => `${issue.path}: ${issue.message}`).join('; ');

interface StringOptions {
    /** Shortest allowed length */
    readonly minLength?: number;
    /** Longest allowed length */
    readonly maxLength?: number;
    /** Must not use the g or y flags */
    readonly pattern?: RegExp;
}

export const string = (options: StringOptions = {}): Validator<string> => {
    const { minLength = 0, maxLength = Number.POSITIVE_INFINITY, pattern } = options;

    return (input, path) => {
        if (typeof input !== 'string') {
            return fail(path, 'expected a string');
        }

        if (input.length < minLength) {
            return fail(path, `expected at least ${minLength} characters`);
        }

        if (input.length > maxLength) {
            return fail(path, `expected at most ${maxLength} characters`);
        }

        if (pattern !== undefined && !pattern.test(input)) {
            return fail(path, 'has an invalid format');
        }

        return ok(input);
    };
};

interface NumberOptions {
    /** Rejects fractions */
    readonly integer?: boolean;
    /** Smallest allowed value, inclusive */
    readonly min?: number;
    /** Largest allowed value, inclusive */
    readonly max?: number;
}

export const number = (options: NumberOptions = {}): Validator<number> => {
    const { integer = false, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = options;

    return (input, path) => {
        if (typeof input !== 'number' || !Number.isFinite(input)) {
            return fail(path, 'expected a finite number');
        }

        if (integer && !Number.isInteger(input)) {
            return fail(path, 'expected an integer');
        }

        if (input < min || input > max) {
            return fail(path, `expected a number in [${min}, ${max}]`);
        }

        return ok(input);
    };
};

export const boolean = (): Validator<boolean> => (input, path) =>
    typeof input === 'boolean' ? ok(input) : fail(path, 'expected a boolean');

export const unknownValue: Validator<unknown> = input => ok(input);

export const nothing: Validator<null> = (input, path) =>
    input === undefined || input === null ? ok(null) : fail(path, 'expected no value');

export const literal = <const T extends string | number | boolean>(expected: T): Validator<T> => {
    const message = `expected ${JSON.stringify(expected)}`;

    return (input, path) => (input === expected ? ok(expected) : fail(path, message));
};

export const oneOf = <const T extends readonly (string | number)[]>(values: T): Validator<T[number]> => {
    const message = `expected one of: ${values.join(', ')}`;

    return (input, path) => {
        const match = values.find(value => value === input);

        return match === undefined ? fail(path, message) : ok(match);
    };
};

interface ArrayOptions {
    /** Fewest allowed items, 0 by default. */
    readonly minLength?: number;
    /** Most allowed items, unlimited by default. */
    readonly maxLength?: number;
}

export const array = <T>(item: Validator<T>, options: ArrayOptions = {}): Validator<T[]> => {
    const { minLength = 0, maxLength = Number.POSITIVE_INFINITY } = options;

    return (input, path) => {
        if (!Array.isArray(input)) {
            return fail(path, 'expected an array');
        }

        if (input.length < minLength) {
            return fail(path, `expected at least ${minLength} items`);
        }

        if (input.length > maxLength) {
            return fail(path, `expected at most ${maxLength} items`);
        }

        const values: T[] = [];
        const issues: Issue[] = [];

        input.forEach((element: unknown, idx) => {
            const result = item(element, `${path}[${idx}]`);

            if (result.ok) {
                values.push(result.value);
            } else {
                issues.push(...result.issues);
            }
        });

        return issues.length === 0 ? ok(values) : { ok: false, issues };
    };
};

const OPTIONAL: unique symbol = Symbol('optional');

export interface OptionalValidator<T> {
    /** Validates the property when it is present */
    readonly [OPTIONAL]: Validator<T>;
}

/** Marks an object property as optional */
export const optional = <T>(validator: Validator<T>): OptionalValidator<T> => ({ [OPTIONAL]: validator });

type Shape = Readonly<Record<string, Validator<unknown> | OptionalValidator<unknown>>>;

type RequiredKeys<S extends Shape> = {
    [K in keyof S]: S[K] extends OptionalValidator<unknown> ? never : K;
}[keyof S];

type OptionalKeys<S extends Shape> = Exclude<keyof S, RequiredKeys<S>>;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type ObjectOf<S extends Shape> = Simplify<
    { [K in RequiredKeys<S>]: S[K] extends Validator<infer T> ? T : never } & {
        [K in OptionalKeys<S>]?: S[K] extends OptionalValidator<infer T> ? T : never;
    }
>;

const isPlainObject = (input: unknown): input is Readonly<Record<string, unknown>> =>
    typeof input === 'object' && input !== null && !Array.isArray(input);

/** Validates a plain object against a shape */
export const object = <const S extends Shape>(shape: S): Validator<ObjectOf<S>> => {
    const known = new Set(Object.keys(shape));

    return (input, path) => {
        if (!isPlainObject(input)) {
            return fail(path, 'expected an object');
        }

        const issues: Issue[] = [];
        const output: Record<string, unknown> = {};

        for (const key of Object.keys(input)) {
            if (!known.has(key)) {
                issues.push({
                    path: `${path}.${key}`,
                    message: 'unknown property',
                });
            }
        }

        for (const [key, entry] of Object.entries(shape)) {
            const value = Object.hasOwn(input, key) ? input[key] : undefined;
            const isOptional = typeof entry === 'object';

            if (isOptional && value === undefined) {
                continue;
            }

            const result = isOptional ? entry[OPTIONAL](value, `${path}.${key}`) : entry(value, `${path}.${key}`);

            if (result.ok) {
                output[key] = result.value;
            } else {
                issues.push(...result.issues);
            }
        }

        if (issues.length > 0) {
            return { ok: false, issues };
        }

        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the loop above builds exactly ObjectOf<S>
        return ok(output as ObjectOf<S>);
    };
};

/** Picks the variant validator by a string tag such as type or syntaxType. */
export const discriminatedUnion = <const M extends Readonly<Record<string, Validator<unknown>>>>(
    key: string,
    variants: M,
): Validator<Infer<M[keyof M]>> => {
    const tags = Object.keys(variants);

    return (input, path) => {
        if (!isPlainObject(input)) {
            return fail(path, 'expected an object');
        }

        const tag = Object.hasOwn(input, key) ? input[key] : undefined;
        const variant = typeof tag === 'string' && Object.hasOwn(variants, tag) ? variants[tag] : undefined;

        if (variant === undefined) {
            return fail(`${path}.${key}`, `expected one of: ${tags.join(', ')}`);
        }

        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the variant under this tag yields its member of the union
        return variant(input, path) as Result<Infer<M[keyof M]>>;
    };
};

/** Adds a business-rule check on top of a structural validator */
export const refine = <T>(validator: Validator<T>, check: (value: T) => NotRequired<string>): Validator<T> => {
    return (input, path) => {
        const result = validator(input, path);

        if (!result.ok) {
            return result;
        }

        const problem = check(result.value);

        if (problem !== undefined) {
            return fail(path, problem);
        }

        return result;
    };
};
