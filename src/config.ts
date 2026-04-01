// src/config.ts
// Simplified config - no more Supabase/Dropbox

export const CONFIG = {
  // Crypto settings
  PBKDF2_ITERATIONS: 310000,
  IV_LENGTH: 12,
  SALT_LENGTH: 16,
  FILE_FORMAT_VERSION: 1,
  MAGIC_BYTES: new Uint8Array([0x56, 0x4F, 0x49, 0x44]), // "VOID"
  
  // File limits
  HARD_MAX_MB: 2048,
  HARD_MAX_BYTES: 2048 * 1024 * 1024,
  
  // Chunk size for P2P transfer (1MB)
  CHUNK_SIZE: 1024 * 1024,
} as const;

export default CONFIG;
