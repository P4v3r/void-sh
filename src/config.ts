// src/config.ts

export const CONFIG = {
  PBKDF2_ITERATIONS: 310000,
  IV_LENGTH: 12,
  SALT_LENGTH: 16,
  CHUNK_SIZE: 4 * 1024 * 1024, // 4MB per chunk
  MAGIC_BYTES: new Uint8Array([0x56, 0x4F, 0x49, 0x44]), // "VOID"
  FILE_FORMAT_VERSION: 2,
  HARD_MAX_MB: 2048,
  HARD_MAX_BYTES: 2048 * 1024 * 1024,
} as const;

export default CONFIG;
