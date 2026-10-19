import { string } from './validation.ts';

const VARIABLE_RGXS = {
    ID: /^[A-Za-z0-9_-]+$/,
    DOMAIN: /^[a-z0-9-]+(\.[a-z0-9-]+)*$/,
} as const;

export const identifier = string({ minLength: 1, maxLength: 64, pattern: VARIABLE_RGXS.ID });

export const getRandomUUID = (): string => crypto.randomUUID();

export const domainName = string({ minLength: 1, maxLength: 253, pattern: VARIABLE_RGXS.DOMAIN });
