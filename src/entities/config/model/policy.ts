import { array, boolean, oneOf, string, type Issue, type Validator } from '#shared/lib';

export enum Features {
    REDIRECT = 'redirect',
    HEADERS = 'headers',
    BLOCK = 'block',
    MOCKS = 'mocks',
    API_CLIENT = 'apiClient',
}

export type Feature = `${Features}`;

export const FEATURES = Object.values(Features);

/** Settings an administrator sets through enterprise policy (chrome.storage.managed) */
export interface ManagedPolicy {
    /** Features the organization turned off */
    readonly disabledFeatures?: readonly Feature[];
    /** Hosts the extension may ever be granted: example.com or *.example.com */
    readonly allowedHosts?: readonly string[];
    /** When false, only rules shipped by the policy apply */
    readonly allowUserRules?: boolean;
    /** When true, API client secrets must be encrypted with a master password */
    readonly requireVault?: boolean;
    /** Preset rules and mocks: an export bundle serialized as JSON */
    readonly presetBundle?: string;
}

export interface PolicyReadResult {
    /** Valid fields, plus the fail-closed values of broken ones */
    readonly policy: ManagedPolicy;
    /** Every problem found, for the UI to show */
    readonly issues: readonly Issue[];
}

interface PolicyField<T> {
    /** Checks the administrator's value */
    readonly validator: Validator<T>;
    /** Applied when the field is present but invalid: always the most restrictive reading */
    readonly failClosed?: T;
}

type PolicyFields = { readonly [K in keyof Required<ManagedPolicy>]: PolicyField<Required<ManagedPolicy>[K]> };

/** example.com or *.example.com */
const HOST_RGX = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*$/;

const POLICY_ERRORS = {
    NOT_OBJECT: 'expected an object',
    UNKNOWN_KEY: 'unknown policy, ignored',
} as const;

const host = string({ minLength: 1, maxLength: 253, pattern: HOST_RGX });

const POLICY_FIELDS: PolicyFields = {
    disabledFeatures: {
        validator: array(oneOf(FEATURES), { maxLength: FEATURES.length }),
        failClosed: FEATURES,
    },
    allowedHosts: {
        validator: array(host, { maxLength: 1000 }),
        failClosed: [],
    },
    allowUserRules: {
        validator: boolean(),
        failClosed: false,
    },
    requireVault: {
        validator: boolean(),
        failClosed: true,
    },
    presetBundle: {
        validator: string({ maxLength: 1_000_000 }),
    },
};

const isPolicyKey = (key: string): key is keyof ManagedPolicy => Object.hasOwn(POLICY_FIELDS, key);

export const readPolicy = (raw: unknown): PolicyReadResult => {
    const isMissing = raw === undefined || raw === null;

    if (isMissing) {
        return {
            policy: {},
            issues: [],
        };
    }

    const isObject = typeof raw === 'object' && !Array.isArray(raw);

    if (!isObject) {
        return {
            policy: {},
            issues: [
                {
                    path: '$',
                    message: POLICY_ERRORS.NOT_OBJECT,
                },
            ],
        };
    }

    const policy: Record<string, unknown> = {};
    const issues: Issue[] = [];

    for (const [key, value] of Object.entries(raw)) {
        if (!isPolicyKey(key)) {
            issues.push({
                path: `$.${key}`,
                message: POLICY_ERRORS.UNKNOWN_KEY,
            });

            continue;
        }

        const field: PolicyField<unknown> = POLICY_FIELDS[key];
        const result = field.validator(value, `$.${key}`);

        if (result.ok) {
            policy[key] = result.value;

            continue;
        }

        issues.push(...result.issues);

        const hasFailClosed = field.failClosed !== undefined;

        if (hasFailClosed) {
            policy[key] = field.failClosed;
        }
    }

    return {
        policy,
        issues,
    };
};

export const isFeatureEnabled = (policy: ManagedPolicy, feature: Feature): boolean => {
    const disabledFeatures = policy.disabledFeatures ?? [];

    return !disabledFeatures.includes(feature);
};
