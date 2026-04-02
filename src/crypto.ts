// crypto.ts
// AES-256-GCM chunked encryption and decryption utilities using the Web Crypto API.
// Files are split into 4MB chunks, each encrypted with its own IV, keeping memory usage constant.
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
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
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
      salt: salt.buffer as ArrayBuffer,
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
 * Encrypts a file using AES-256-GCM with chunked processing.
 * Each chunk (4MB) is encrypted with its own IV, keeping memory usage constant.
 *
 * @param file - The file to encrypt.
 * @param password - Optional. If provided, derives key from password via PBKDF2.
 *                   Otherwise, generates a random key.
 * @param onProgress - Optional callback reporting progress (0-100).
 * @returns An object containing the encrypted Blob and the key/password string.
 *
 * Output format:
 *   - Password mode: [SALT 16B] + [IV_0 12B] + [IV_1 12B] + ... + [IV_N 12B] + [CHUNK_0] + [CHUNK_1] + ...
 *   - Random key mode: [IV_0 12B] + [IV_1 12B] + ... + [IV_N 12B] + [CHUNK_0] + [CHUNK_1] + ...
 *                      (key:IVs returned as base64 string)
 */
export async function encryptFile(
  file: File,
  password?: string,
  onProgress?: ProgressCallback
): Promise<EncryptResult> {
  let key: CryptoKey;
  let keyString = '';
  const chunkSize = CONFIG.CHUNK_SIZE;
  const totalChunks = Math.ceil(file.size / chunkSize);
  const ivs: Uint8Array[] = [];

  onProgress?.(5);

  // --- Key setup ---
  let salt: Uint8Array | null = null;

  if (password) {
    // --- Password mode: derive key via PBKDF2 ---
    salt = crypto.getRandomValues(new Uint8Array(CONFIG.SALT_LENGTH));
    key = await deriveKeyFromPassword(password, salt);
    onProgress?.(20);
    keyString = password;
  } else {
    // --- Random key mode: generate a secure random key ---
    key = await generateKey();
    onProgress?.(20);
  }

  // --- Encrypt each chunk ---
  const encryptedChunks: Blob[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);
    const chunkBuffer = await chunkBlob.arrayBuffer();

    // Generate a unique IV for each chunk
    const iv = crypto.getRandomValues(new Uint8Array(CONFIG.IV_LENGTH));
    ivs.push(iv);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      chunkBuffer
    );
    encryptedChunks.push(new Blob([encrypted]));

    // Report progress: 20% to 95% for encryption phase
    const progress = 20 + ((i + 1) / totalChunks) * 75;
    onProgress?.(Math.round(progress));
  }

  // --- Build the final blob ---
  // Header: [SALT 16B (if password mode)] + [IV_0 12B] + [IV_1 12B] + ... + [IV_N 12B]
  // Body: [CHUNK_0] + [CHUNK_1] + ... + [CHUNK_N]

  const headerParts: BlobPart[] = [];

  if (salt) {
    headerParts.push(new Uint8Array(salt));
  }

  // Concatenate all IVs into the header
  for (const iv of ivs) {
    headerParts.push(new Uint8Array(iv));
  }

  const headerBlob = new Blob(headerParts);
  const allParts = [headerBlob, ...encryptedChunks];

  // Export key for random key mode
  if (!password) {
    const rawKey = await crypto.subtle.exportKey('raw', key);
    const keyB64 = arrayBufferToBase64(rawKey);
    // Store all IVs as colon-separated base64 strings
    const ivsB64 = ivs.map(iv => arrayBufferToBase64(iv.buffer as ArrayBuffer)).join(':');
    keyString = `${keyB64}:${ivsB64}`;
  }

  onProgress?.(100);

  return {
    encryptedBlob: new Blob(allParts, { type: 'application/octet-stream' }),
    keyString,
  };
}

/**
 * Decrypts an encrypted blob using the provided key or password.
 *
 * @param encryptedBlob - The blob produced by encryptFile().
 * @param keyOrPassword - Either a "key:iv0:iv1:..." base64 string (random key mode)
 *                        or a raw password (password mode).
 * @returns The decrypted file as a Blob.
 *
 * Detection logic:
 *   - If the key contains ":", it's treated as a random key:IVs pair.
 *     The blob format is: [IV_0 12B] + [IV_1 12B] + ... + [CHUNK_0] + [CHUNK_1] + ...
 *   - Otherwise, it's treated as a password.
 *     The blob format is: [SALT 16B] + [IV_0 12B] + [IV_1 12B] + ... + [CHUNK_0] + [CHUNK_1] + ...
 */
export async function decryptFile(
  encryptedBlob: Blob,
  keyOrPassword: string,
): Promise<Blob> {

  const buffer = await encryptedBlob.arrayBuffer();
  const u8 = new Uint8Array(buffer);

  if (keyOrPassword.includes(':')) {
    // --- Random key mode: parse key:iv0:iv1:... ---
    const parts = keyOrPassword.split(':');
    const keyB64 = parts[0];
    const ivsB64 = parts.slice(1);

    if (!keyB64 || ivsB64.length === 0) {
      throw new Error('Invalid key format. Expected "key:iv0:iv1:..." base64 string.');
    }

    const rawKeyBuffer = base64ToArrayBuffer(keyB64);
    const ivs = ivsB64.map(ivB64 => new Uint8Array(base64ToArrayBuffer(ivB64)));

    const key = await crypto.subtle.importKey(
      'raw',
      rawKeyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );

    // Header size: number of IVs * 12 bytes
    const headerSize = ivs.length * CONFIG.IV_LENGTH;
    const dataStart = headerSize;
    const dataBuffer = u8.slice(dataStart);

    // Decrypt each chunk
    const decryptedChunks: Blob[] = [];
    let offset = 0;

    for (let i = 0; i < ivs.length; i++) {
      // Each encrypted chunk is the same size as the original chunk (plus 16 bytes GCM tag)
      // For the last chunk, it's whatever remains
      const isLastChunk = i === ivs.length - 1;
      const chunkSize = isLastChunk
        ? dataBuffer.byteLength - offset
        : CONFIG.CHUNK_SIZE + 16; // AES-GCM adds 16-byte auth tag

      const encryptedChunk = dataBuffer.slice(offset, offset + chunkSize);
      offset += chunkSize;

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivs[i] },
        key,
        encryptedChunk,
      );
      decryptedChunks.push(new Blob([decrypted]));
    }

    return new Blob(decryptedChunks);

  } else {
    // --- Password mode: extract salt and IVs from blob header ---
    const salt = u8.slice(0, CONFIG.SALT_LENGTH);
    const key = await deriveKeyFromPassword(keyOrPassword, salt);

    // Calculate how many IVs are in the header
    const ivHeaderStart = CONFIG.SALT_LENGTH;
    const ivHeaderSize = u8.byteLength - ivHeaderStart;
    const numIvs = Math.floor(ivHeaderSize / CONFIG.IV_LENGTH);

    if (numIvs === 0) {
      throw new Error('Invalid encrypted file: no chunk IVs found.');
    }

    // Extract all IVs
    const ivs: Uint8Array[] = [];
    for (let i = 0; i < numIvs; i++) {
      const start = ivHeaderStart + i * CONFIG.IV_LENGTH;
      ivs.push(u8.slice(start, start + CONFIG.IV_LENGTH));
    }

    // Data starts after all IVs
    const dataStart = ivHeaderStart + numIvs * CONFIG.IV_LENGTH;
    const dataBuffer = u8.slice(dataStart);

    // Decrypt each chunk
    const decryptedChunks: Blob[] = [];
    let offset = 0;

    for (let i = 0; i < ivs.length; i++) {
      const isLastChunk = i === ivs.length - 1;
      const chunkSize = isLastChunk
        ? dataBuffer.byteLength - offset
        : CONFIG.CHUNK_SIZE + 16;

      const encryptedChunk = dataBuffer.slice(offset, offset + chunkSize);
      offset += chunkSize;

      try {
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivs[i].buffer as ArrayBuffer },
          key,
          encryptedChunk,
        );
        decryptedChunks.push(new Blob([decrypted]));
      } catch {
        throw new Error('Decryption failed. Wrong password or corrupted file.');
      }
    }

    return new Blob(decryptedChunks);
  }
}
