import { string } from './validation.ts';

/** Records of the policy get ids of their own, which no record of the user may take */
export const POLICY_ID_PREFIX = 'policy:';

const IDENTIFIER_RGXS = {
    ID: /^(policy:)?[A-Za-z0-9_-]+$/,
    DOMAIN: /^[a-z0-9-]+(\.[a-z0-9-]+)*$/,
} as const;

const MAX_ID_LENGTH = 64;

export const identifier = string({
    minLength: 1,
    maxLength: MAX_ID_LENGTH + POLICY_ID_PREFIX.length,
    pattern: IDENTIFIER_RGXS.ID,
});

export const isPolicyId = (id: string): boolean => id.startsWith(POLICY_ID_PREFIX);

export const getRandomUUID = (): string => crypto.randomUUID();

export const domainName = string({ minLength: 1, maxLength: 253, pattern: IDENTIFIER_RGXS.DOMAIN });

export const MAX_DISPLAY_NAME_LENGTH = 200;

export const displayName = string({ minLength: 1, maxLength: MAX_DISPLAY_NAME_LENGTH });
