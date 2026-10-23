import { describe, expect, it } from '@rstest/core';

import {
    createSalt,
    decodeBase64,
    decryptText,
    deriveKeyBytes,
    encodeBase64,
    encodedKey,
    encodedSalt,
    encryptedValue,
    encryptText,
} from '../crypto.ts';
import { validate } from '../validation.ts';

/** Few rounds keep the tests fast; the rounds a vault uses come from its stored parameters */
const TEST_ITERATIONS = 1000;

const PASSWORD = 'correct horse';

const SALT = createSalt();

const KEY_BYTES = await deriveKeyBytes(PASSWORD, SALT, TEST_ITERATIONS);

const OTHER_KEY_BYTES = await deriveKeyBytes('wrong horse', SALT, TEST_ITERATIONS);

describe('base64', () => {
    it.each([
        { name: 'empty bytes', bytes: [] },
        { name: 'every byte value', bytes: Array.from({ length: 256 }, (_, idx) => idx) },
    ])('keeps $name through encoding', ({ bytes }) => {
        const encoded = encodeBase64(new Uint8Array(bytes));

        expect([...decodeBase64(encoded)]).toEqual(bytes);
    });
});

describe('deriveKeyBytes', () => {
    it('derives the same 32-byte key from the same password and salt', async () => {
        const repeatedKeyBytes = await deriveKeyBytes(PASSWORD, SALT, TEST_ITERATIONS);

        expect(repeatedKeyBytes).toBe(KEY_BYTES);

        expect(validate(encodedKey, KEY_BYTES).ok).toBe(true);
    });

    it('derives another key from another salt', async () => {
        const otherSaltKeyBytes = await deriveKeyBytes(PASSWORD, createSalt(), TEST_ITERATIONS);

        expect(otherSaltKeyBytes).not.toBe(KEY_BYTES);
    });
});

describe('createSalt', () => {
    it('gives 16 random bytes', () => {
        expect(validate(encodedSalt, SALT).ok).toBe(true);

        expect(createSalt()).not.toBe(SALT);
    });
});

describe('encryptText', () => {
    it('opens with the same key', async () => {
        const encrypted = await encryptText(KEY_BYTES, 'Bearer abc · ключ');

        expect(await decryptText(KEY_BYTES, encrypted)).toBe('Bearer abc · ключ');
    });

    it('gives a valid envelope with a fresh nonce each time', async () => {
        const first = await encryptText(KEY_BYTES, 'abc');
        const second = await encryptText(KEY_BYTES, 'abc');

        expect(validate(encryptedValue, first).ok).toBe(true);

        expect(first.iv).not.toBe(second.iv);

        expect(first.ct).not.toBe(second.ct);
    });

    it('does not open with another key', async () => {
        const encrypted = await encryptText(KEY_BYTES, 'abc');

        await expect(decryptText(OTHER_KEY_BYTES, encrypted)).rejects.toThrow();
    });

    it('does not open once the ciphertext was changed', async () => {
        const encrypted = await encryptText(KEY_BYTES, 'abc');
        const changedBytes = decodeBase64(encrypted.ct).map((byte, idx) => (idx === 0 ? byte ^ 1 : byte));
        const changed = { ...encrypted, ct: encodeBase64(changedBytes) };

        await expect(decryptText(KEY_BYTES, changed)).rejects.toThrow();
    });
});
