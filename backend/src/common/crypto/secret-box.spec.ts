import { randomBytes } from 'crypto';
import { decryptSecret, encryptSecret, parseEncryptionKey } from './secret-box';

describe('secret box (AES-256-GCM)', () => {
  const key = randomBytes(32);

  it('round-trips and never repeats a ciphertext', () => {
    const a = encryptSecret('NL91ABNA0417164300', key);
    const b = encryptSecret('NL91ABNA0417164300', key);
    expect(a).not.toBe(b);
    expect(a).not.toContain('NL91');
    expect(decryptSecret(a, key)).toBe('NL91ABNA0417164300');
  });

  it('rejects a wrong key, tampering and unknown formats', () => {
    const box = encryptSecret('secret', key);
    expect(() => decryptSecret(box, randomBytes(32))).toThrow();
    const parts = box.split(':');
    parts[3] = Buffer.from('evil').toString('base64');
    expect(() => decryptSecret(parts.join(':'), key)).toThrow();
    expect(() => decryptSecret('v2:a:b:c', key)).toThrow();
    expect(() => decryptSecret('garbage', key)).toThrow();
  });

  it('only accepts a base64 key of exactly 32 bytes', () => {
    expect(parseEncryptionKey(key.toString('base64'))).toEqual(key);
    expect(parseEncryptionKey(randomBytes(16).toString('base64'))).toBeNull();
    expect(parseEncryptionKey('')).toBeNull();
    expect(parseEncryptionKey(undefined)).toBeNull();
  });
});
