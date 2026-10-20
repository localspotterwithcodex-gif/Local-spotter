import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const VERSION = 'v1';

/** ENCRYPTION_KEY must be base64 of exactly 32 bytes (node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"). */
export function parseEncryptionKey(value: string | undefined | null): Buffer | null {
  if (!value) return null;
  const key = Buffer.from(value.trim(), 'base64');
  return key.length === 32 ? key : null;
}

/** AES-256-GCM. Output: v1:<iv>:<tag>:<ciphertext> (base64). A fresh random IV is used for every call. */
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

/** Throws when the value was tampered with or the key is wrong (GCM authentication). */
export function decryptSecret(box: string, key: Buffer): string {
  const [version, iv, tag, data] = box.split(':');
  if (version !== VERSION || !iv || !tag || !data) throw new Error('Unsupported secret format');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
