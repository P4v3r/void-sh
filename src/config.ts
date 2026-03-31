// src/config.ts
// Centralized configuration for void.sh
// All secrets should be set via environment variables (VITE_* prefix for Vite)

export const CONFIG = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // Dropbox
  DROPBOX_APP_KEY: import.meta.env.VITE_DROPBOX_APP_KEY,
  DROPBOX_REDIRECT_URI: typeof window !== 'undefined' 
    ? window.location.origin + '/' 
    : '',
  
  // Limits
  MAX_UPLOAD_MB: 50,
  MAX_UPLOAD_BYTES: 50 * 1024 * 1024,
  HARD_MAX_MB: 2048,
  HARD_MAX_BYTES: 2048 * 1024 * 1024,
  
  // Crypto
  PBKDF2_ITERATIONS: 310000,
  IV_LENGTH: 12,
  SALT_LENGTH: 16,
  
  // Magic number for file format versioning (ASCII: "VOID")
  FILE_FORMAT_VERSION: 1,
  MAGIC_BYTES: new Uint8Array([0x56, 0x4F, 0x49, 0x44]),
} as const;

// Validate required config in development
if (import.meta.env.DEV) {
  const required: (keyof typeof CONFIG)[] = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DROPBOX_APP_KEY'];
  for (const key of required) {
    if (!CONFIG[key]) {
      console.warn(`[void.sh] Missing required config: ${key}`);
    }
  }
}

export default CONFIG;
