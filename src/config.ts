// src/config.ts
// Application constants for encryption parameters.

export const CONFIG = {
  /** PBKDF2 iterations for password-based key derivation */
  PBKDF2_ITERATIONS: 310000,
  /** AES-GCM initialization vector length in bytes */
  IV_LENGTH: 12,
  /** PBKDF2 salt length in bytes */
  SALT_LENGTH: 16,
  /** Chunk size for encryption: 4MB. Keeps memory usage constant regardless of file size. */
  CHUNK_SIZE: 4 * 1024 * 1024,
} as const;

export default CONFIG;
