// crypto.ts
// AES-256-GCM encryption and decryption utilities using the Web Crypto API.
// Supports two key modes: random key (exported as base64) and password-based (PBKDF2).

import CONFIG from './config';

export type EncryptionProgressCallback = (progress: number) => void;

// --- Utility: ArrayBuffer to Base64 ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// --- Utility: Base64 to ArrayBuffer ---
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// --- Key Derivation: PBKDF2 from password ---
// Derives a 256-bit AES-GCM key from a user password using PBKDF2 with SHA-256.
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: CONFIG.PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// --- Key Generation: random AES-256-GCM key ---
async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// --- Result type for encryption ---
export type EncryptResult = {
  encryptedBlob: Blob;
  keyString: string;
};

type ProgressCallback = (progress: number) => void;

/**
 * Encrypts a file using AES-256-GCM.
 *
 * @param file - The file to encrypt.
 * @param password - Optional. If provided, derives key from password via PBKDF2.
 *                   Otherwise, generates a random key.
 * @param onProgress - Optional callback reporting progress (0-100).
 * @returns An object containing the encrypted Blob and the key/password string.
 *
 * Output format:
 *   - Password mode: [SALT 16B] + [IV 12B] + [Encrypted Data]
 *   - Random key mode: [Encrypted Data] (key:IV returned as base64 string)
 */
export async function encryptFile(
  file: File,
  password?: string,
  onProgress?: ProgressCallback
): Promise<EncryptResult> {
  let key: CryptoKey;
  let keyString = '';
  const iv = crypto.getRandomValues(new Uint8Array(CONFIG.IV_LENGTH));

  onProgress?.(5);

  if (password) {
    // --- Password mode: derive key via PBKDF2 ---
    const salt = crypto.getRandomValues(new Uint8Array(CONFIG.SALT_LENGTH));
    key = await deriveKeyFromPassword(password, salt);
    onProgress?.(30);

    // Return the raw password as the key string for decryption
    keyString = password;

    const fileBuffer = await file.arrayBuffer();
    onProgress?.(50);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );
    onProgress?.(80);

    // Build final blob: [SALT] + [IV] + [Encrypted Data]
    const combinedBuffer = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
    combinedBuffer.set(salt, 0);
    combinedBuffer.set(iv, salt.byteLength);
    combinedBuffer.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);

    onProgress?.(100);

    return {
      encryptedBlob: new Blob([combinedBuffer], { type: 'application/octet-stream' }),
      keyString,
    };
  } else {
    // --- Random key mode: generate a secure random key ---
    key = await generateKey();
    onProgress?.(30);

    const fileBuffer = await file.arrayBuffer();
    onProgress?.(50);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      fileBuffer
    );
    onProgress?.(80);

    // Export key and IV as base64, joined by ":" for easy copy-paste
    const rawKey = await crypto.subtle.exportKey('raw', key);
    const keyB64 = arrayBufferToBase64(rawKey);
    const ivB64 = arrayBufferToBase64(iv.buffer);

    keyString = `${keyB64}:${ivB64}`;

    onProgress?.(100);

    return {
      encryptedBlob: new Blob([encrypted], { type: 'application/octet-stream' }),
      keyString,
    };
  }
}

/**
 * Decrypts an encrypted blob using the provided key or password.
 *
 * @param encryptedBlob - The blob produced by encryptFile().
 * @param keyOrPassword - Either a "key:IV" base64 string (random key mode)
 *                        or a raw password (password mode).
 * @returns The decrypted file as a Blob.
 *
 * Detection logic:
 *   - If the key contains ":", it's treated as a random key:IV pair.
 *     The blob contains only the raw encrypted data.
 *   - Otherwise, it's treated as a password.
 *     The blob format is: [SALT 16B] + [IV 12B] + [Encrypted Data]
 */
export async function decryptFile(
  encryptedBlob: Blob,
  keyOrPassword: string,
): Promise<Blob> {

  if (keyOrPassword.includes(':')) {
    // --- Random key mode: parse key:IV ---
    const [keyB64, ivB64] = keyOrPassword.split(':');
    if (!keyB64 || !ivB64) throw new Error('Invalid key format. Expected "key:iv" base64 string.');

    const rawKeyBuffer = base64ToArrayBuffer(keyB64);
    const ivBuffer = base64ToArrayBuffer(ivB64);

    const key = await crypto.subtle.importKey(
      'raw',
      rawKeyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );

    const encryptedBuffer = await encryptedBlob.arrayBuffer();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
      key,
      encryptedBuffer,
    );

    return new Blob([decrypted]);

  } else {
    // --- Password mode: extract salt and IV from blob header ---
    const buffer = await encryptedBlob.arrayBuffer();
    const u8 = new Uint8Array(buffer);

    const salt = u8.slice(0, CONFIG.SALT_LENGTH);
    const iv = u8.slice(CONFIG.SALT_LENGTH, CONFIG.SALT_LENGTH + CONFIG.IV_LENGTH);
    const data = u8.slice(CONFIG.SALT_LENGTH + CONFIG.IV_LENGTH);

    const key = await deriveKeyFromPassword(keyOrPassword, salt);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      return new Blob([decrypted]);
    } catch {
      throw new Error('Decryption failed. Wrong password or corrupted file.');
    }
  }
}
