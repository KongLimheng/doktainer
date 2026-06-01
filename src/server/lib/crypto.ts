import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'dev-32-char-encryption-key-here!';
  // Derive a 32-byte key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a plaintext string (e.g. SSH private key or password)
 * Returns base64-encoded "iv:authTag:ciphertext"
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypt an encrypted string produced by `encrypt()`
 */
export function decrypt(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid encrypted format');

  const iv       = Buffer.from(ivB64, 'base64');
  const authTag  = Buffer.from(tagB64, 'base64');
  const data     = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
