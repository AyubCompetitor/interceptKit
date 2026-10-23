export const VAULT_CONFIG = {
    /** PBKDF2-SHA256 rounds for a new vault, as OWASP advises */
    KEY_ITERATIONS: 600_000,
    /** Idle time after which the vault locks itself, in milliseconds */
    AUTO_LOCK_MS: 15 * 60_000,
    /** Shortest master password a new vault takes */
    MIN_PASSWORD_LENGTH: 8,
} as const;
