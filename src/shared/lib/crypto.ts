import { literal, object, string, type Validator } from './validation.ts';

/** A text encrypted with AES-GCM */
export interface EncryptedValue {
    /** Envelope format version */
    readonly v: 1;
    /** Base64 of a 12-byte nonce */
    readonly iv: string;
    /** Base64 ciphertext with the authentication tag */
    readonly ct: string;
}

const BASE64_RGX = /^[A-Za-z0-9+/]*={0,2}$/;

const CRYPTO_SIZES = {
    IV_BYTES: 12,
    SALT_BYTES: 16,
    KEY_BYTES: 32,
    MAX_CIPHERTEXT_LENGTH: 1_000_000,
} as const;

const ALGORITHMS = {
    AES_GCM: 'AES-GCM',
    PBKDF2: 'PBKDF2',
    SHA_256: 'SHA-256',
    RAW: 'raw',
} as const;

const TEXT_ENCODER = new TextEncoder();

const TEXT_DECODER = new TextDecoder();

const getBase64Length = (byteCount: number): number => Math.ceil(byteCount / 3) * 4;

const encodedBytes = (byteCount: number): Validator<string> =>
    string({
        minLength: getBase64Length(byteCount),
        maxLength: getBase64Length(byteCount),
        pattern: BASE64_RGX,
    });

export const encodedSalt = encodedBytes(CRYPTO_SIZES.SALT_BYTES);

export const encodedKey = encodedBytes(CRYPTO_SIZES.KEY_BYTES);

export const encryptedValue: Validator<EncryptedValue> = object({
    v: literal(1),
    iv: encodedBytes(CRYPTO_SIZES.IV_BYTES),
    ct: string({ minLength: 1, maxLength: CRYPTO_SIZES.MAX_CIPHERTEXT_LENGTH, pattern: BASE64_RGX }),
});

export const encodeBase64 = (bytes: Uint8Array): string => {
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCodePoint(byte);
    }

    return btoa(binary);
};

export const decodeBase64 = (text: string): Uint8Array<ArrayBuffer> =>
    Uint8Array.from(atob(text), char => char.codePointAt(0) ?? 0);

const getRandomBytes = (byteCount: number): Uint8Array<ArrayBuffer> =>
    crypto.getRandomValues(new Uint8Array(byteCount));

export const createSalt = (): string => encodeBase64(getRandomBytes(CRYPTO_SIZES.SALT_BYTES));

/** Raw bytes of an AES-256 key derived from the password with PBKDF2-SHA256, in base64 */
export const deriveKeyBytes = async (password: string, salt: string, iterations: number): Promise<string> => {
    const passwordKey = await crypto.subtle.importKey(
        ALGORITHMS.RAW,
        TEXT_ENCODER.encode(password),
        ALGORITHMS.PBKDF2,
        false,
        ['deriveBits'],
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: ALGORITHMS.PBKDF2,
            hash: ALGORITHMS.SHA_256,
            salt: decodeBase64(salt),
            iterations,
        },
        passwordKey,
        CRYPTO_SIZES.KEY_BYTES * 8,
    );

    return encodeBase64(new Uint8Array(bits));
};

const importAesKey = (keyBytes: string, usage: KeyUsage): Promise<CryptoKey> =>
    crypto.subtle.importKey(ALGORITHMS.RAW, decodeBase64(keyBytes), ALGORITHMS.AES_GCM, false, [usage]);

/** Every call takes a fresh random nonce */
export const encryptText = async (keyBytes: string, text: string): Promise<EncryptedValue> => {
    const key = await importAesKey(keyBytes, 'encrypt');
    const iv = getRandomBytes(CRYPTO_SIZES.IV_BYTES);

    const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHMS.AES_GCM, iv }, key, TEXT_ENCODER.encode(text));

    return {
        v: 1,
        iv: encodeBase64(iv),
        ct: encodeBase64(new Uint8Array(ciphertext)),
    };
};

/** Throws when the key is wrong or the value was changed */
export const decryptText = async (keyBytes: string, value: EncryptedValue): Promise<string> => {
    const key = await importAesKey(keyBytes, 'decrypt');

    const plaintext = await crypto.subtle.decrypt(
        { name: ALGORITHMS.AES_GCM, iv: decodeBase64(value.iv) },
        key,
        decodeBase64(value.ct),
    );

    return TEXT_DECODER.decode(plaintext);
};
