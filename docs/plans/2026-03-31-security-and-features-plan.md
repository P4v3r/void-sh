# void.sh - Security & Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical security issues (exposed API keys), resolve code bugs, and implement missing features for void.sh encryption app.

**Architecture:** Refactor to use environment variables for secrets, create shared config modules, implement proper error handling, and add missing UX features. All while maintaining zero-knowledge architecture.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Supabase, Dropbox SDK, Web Crypto API

---

## Phase 1: Critical Security Fixes

### Task 1.1: Fix Exposed API Keys in App.tsx

**Files:**
- Modify: `src/App.tsx:22-28`

**Step 1: Update imports to use env variables**

```typescript
// Replace hardcoded keys with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY;
```

**Step 2: Add validation for missing env vars**

```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Check .env.local');
}
```

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "security: use env vars for API keys instead of hardcoded values"
```

---

### Task 1.2: Fix Exposed API Keys in DownloadPage.tsx

**Files:**
- Modify: `src/DownloadPage.tsx:11-14`

**Step 1: Update DownloadPage.tsx to use env vars**

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Step 2: Commit**

```bash
git add src/DownloadPage.tsx
git commit -m "security: use env vars in DownloadPage.tsx"
```

---

### Task 1.3: Create Shared Config Module

**Files:**
- Create: `src/config.ts`

**Step 1: Create centralized config file**

```typescript
// src/config.ts

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
  
  // Magic number for file format versioning
  FILE_FORMAT_VERSION: 1,
  MAGIC_BYTES: new Uint8Array([0x56, 0x4F, 0x49, 0x44]), // "VOID"
} as const;

// Validate required config
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DROPBOX_APP_KEY'];
for (const key of required) {
  if (!CONFIG[key as keyof typeof CONFIG]) {
    console.error(`Missing required config: ${key}`);
  }
}

export default CONFIG;
```

**Step 2: Update App.tsx to use shared config**

```typescript
// Replace all CONFIG references
import CONFIG from './config';

// Usage: CONFIG.MAX_UPLOAD_BYTES, CONFIG.PBKDF2_ITERATIONS, etc.
```

**Step 3: Update DownloadPage.tsx to use shared config**

```typescript
import CONFIG from './config';
```

**Step 4: Commit**

```bash
git add src/config.ts src/App.tsx src/DownloadPage.tsx
git commit -m "refactor: create shared config module"
```

---

### Task 1.4: Update .env.local with All Required Variables

**Files:**
- Modify: `.env.local`

**Step 1: Update .env.local**

```bash
# Supabase
VITE_SUPABASE_URL=https://rsnjdhkrgtuepivllvux.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here

# Dropbox
VITE_DROPBOX_APP_KEY=7oq2zp76471dpxt
```

**Step 2: Update .gitignore to ensure .env.local is ignored**

```bash
git add .env.local .gitignore
git commit -m "chore: add env variables and ensure .env.local is gitignored"
```

---

## Phase 2: Bug Fixes

### Task 2.1: Fix Duplicate Blob Creation in DownloadPage.tsx

**Files:**
- Modify: `src/DownloadPage.tsx:74-79`

**Step 1: Remove duplicate blob creation**

```typescript
// BEFORE (lines 74-79):
const encBlob = new Blob([data]);
setEncryptedBlob(encBlob);

const encFile = new Blob([data]);
setEncryptedBlob(encFile);

// AFTER:
const encFile = new Blob([data]);
setEncryptedBlob(encFile);
```

**Step 2: Commit**

```bash
git add src/DownloadPage.tsx
git commit -m "fix: remove duplicate blob creation in DownloadPage"
```

---

### Task 2.2: Fix Memory Leak in useEffect

**Files:**
- Modify: `src/DownloadPage.tsx:useEffect cleanup`

**Step 1: Add proper cleanup with AbortController**

```typescript
useEffect(() => {
  let cancelled = false;
  
  const processDownload = async () => {
    // ... existing code
    
    if (!cancelled) {
      // Update state
    }
  };
  
  processDownload();
  
  return () => {
    cancelled = true;
    if (decryptedUrlRef.current) {
      URL.revokeObjectURL(decryptedUrlRef.current);
    }
  };
}, []);
```

**Step 2: Commit**

```bash
git add src/DownloadPage.tsx
git commit -m "fix: prevent memory leak with proper cleanup"
```

---

### Task 2.3: Fix ESLint Errors - any Types

**Files:**
- Modify: `src/App.tsx:37,337`
- Modify: `src/DownloadPage.tsx:117,148`
- Modify: `src/crypto.ts:36`

**Step 1: Fix App.tsx line 37 (isIOSLike)**

```typescript
// BEFORE:
(navigator as any).maxTouchPoints > 1

// AFTER:
(navigator as Navigator).maxTouchPoints > 1
// OR better:
const platform = navigator.platform;
const maxTouchPoints = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints;
```

**Step 2: Fix App.tsx line 337 (decryptFile call)**

```typescript
// If there's an `as any`, remove it or type properly
const decryptedBlob = await decryptFile(encryptedFile as File, decryptKey);
```

**Step 3: Fix DownloadPage.tsx (encFile cast)**

```typescript
// BEFORE:
const blobToDecrypt = new File([encFile], "temp.enc"); 

// AFTER:
const blobToDecrypt = new File([encFile], "temp.enc", { type: 'application/octet-stream' });
```

**Step 4: Fix crypto.ts line 36 (PBKDF2 salt cast)**

```typescript
// BEFORE:
salt: salt as any,

// AFTER:
salt,
```

**Step 5: Fix crypto.ts unused variable (line 167)**

```typescript
// BEFORE:
} catch (e) {

// AFTER:
} catch {
  // Error is logged by console.error
}
```

**Step 6: Commit**

```bash
git add src/App.tsx src/DownloadPage.tsx src/crypto.ts
git commit -m "fix: resolve all ESLint errors"
```

---

### Task 2.4: Add Magic Number to Encrypted File Format

**Files:**
- Modify: `src/crypto.ts`

**Step 1: Update encryptFile for password mode**

```typescript
const MAGIC = new Uint8Array([0x56, 0x4F, 0x49, 0x44]); // "VOID"
const VERSION = new Uint8Array([0x01]); // Version 1

// Build: [MAGIC(4)] + [VERSION(1)] + [SALT(16)] + [IV(12)] + [DATA]
const combinedBuffer = new Uint8Array(
  MAGIC.byteLength + VERSION.byteLength + salt.byteLength + iv.byteLength + encrypted.byteLength
);
let offset = 0;
combinedBuffer.set(MAGIC, offset); offset += MAGIC.byteLength;
combinedBuffer.set(VERSION, offset); offset += VERSION.byteLength;
combinedBuffer.set(salt, offset); offset += salt.byteLength;
combinedBuffer.set(iv, offset); offset += iv.byteLength;
combinedBuffer.set(new Uint8Array(encrypted), offset);
```

**Step 2: Update decryptFile for password mode**

```typescript
const u8 = new Uint8Array(buffer);

// Verify magic number
const MAGIC = new Uint8Array([0x56, 0x4F, 0x49, 0x44]);
const fileMagic = u8.slice(0, 4);
if (fileMagic.toString() !== MAGIC.toString()) {
  throw new Error('Invalid file format');
}

const version = u8[4]; // Could check for supported versions
const salt = u8.slice(5, 21);
const iv = u8.slice(21, 33);
const data = u8.slice(33);
```

**Step 3: Commit**

```bash
git add src/crypto.ts
git commit -m "feat: add magic number and versioning to encrypted file format"
```

---

## Phase 3: Security Improvements

### Task 3.1: Increase PBKDF2 Iterations

**Files:**
- Modify: `src/crypto.ts`
- Uses: `src/config.ts` (already updated in Task 1.3)

**Step 1: Update iterations count**

```typescript
import CONFIG from './config';

// Replace hardcoded 100000 with CONFIG.PBKDF2_ITERATIONS
```

**Step 2: Commit**

```bash
git add src/crypto.ts
git commit -m "security: increase PBKDF2 iterations to 310000"
```

---

### Task 3.2: Add Input Sanitization

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add filename sanitization utility**

```typescript
const sanitizeFilename = (name: string): string => {
  // Remove path separators
  let base = name.split(/[\\/]/).pop() || 'file';
  
  // Normalize unicode
  base = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  
  // Remove/replace dangerous characters
  base = base.replace(/[<>:"|?*\x00-\x1f]/g, '_');
  
  // Limit length
  const maxLength = 200;
  if (base.length > maxLength) {
    const ext = base.split('.').pop() || '';
    base = base.substring(0, maxLength - ext.length - 1) + '.' + ext;
  }
  
  return base || 'file.bin';
};
```

**Step 2: Use sanitization in handleDropEncrypt and handleBrowseEncrypt**

```typescript
const validateAndSetFile = (f: File) => {
  // ... existing size check
  
  // Sanitize filename
  const safeName = sanitizeFilename(f.name);
  
  setFile(new File([f], safeName, { type: f.type }));
  // ...
};
```

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "security: add filename sanitization"
```

---

### Task 3.3: Implement Dropbox Token Persistence

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add localStorage for Dropbox token**

```typescript
const STORAGE_KEY = 'voidsh_dropbox_token';

// Load token from localStorage on mount
useEffect(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    setDbxToken(stored);
  }
}, []);

// Save token to localStorage when changed
useEffect(() => {
  if (dbxToken) {
    localStorage.setItem(STORAGE_KEY, dbxToken);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}, [dbxToken]);

// Add logout function
const handleDropboxLogout = () => {
  setDbxToken(null);
  localStorage.removeItem(STORAGE_KEY);
};
```

**Step 2: Add "Disconnect Dropbox" button in UI**

```typescript
{dbxToken && (
  <button
    onClick={handleDropboxLogout}
    className="text-[11px] text-red-400/50 hover:text-red-300"
  >
    Disconnect Dropbox
  </button>
)}
```

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: persist Dropbox token in localStorage"
```

---

## Phase 4: UX Improvements

### Task 4.1: Add Progress Bar for Large Files

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/crypto.ts`

**Step 1: Add progress callback to crypto functions**

```typescript
// crypto.ts
type ProgressCallback = (progress: number) => void;

export async function encryptFile(
  file: File, 
  password?: string,
  onProgress?: ProgressCallback
): Promise<EncryptResult> {
  // ... existing code
  
  // Simulate progress for crypto operations
  onProgress?.(10);
  
  // When reading file
  const fileBuffer = await file.arrayBuffer();
  onProgress?.(50);
  
  // When encrypting
  onProgress?.(70);
  
  // When done
  onProgress?.(100);
  
  return { encryptedBlob, keyString };
}
```

**Step 2: Add progress state and UI in App.tsx**

```typescript
const [progress, setProgress] = useState(0);

// Update startEncrypt call
const { encryptedBlob, keyString } = await encryptFile(file, passwordToUse, setProgress);
```

**Step 3: Add progress bar UI**

```typescript
{status === 'ENCRYPTING' && (
  <div className="mt-4">
    <div className="h-2 bg-emerald-900/50 rounded-full overflow-hidden">
      <div 
        className="h-full bg-emerald-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
    <p className="text-[11px] text-emerald-400/70 mt-1 text-center">
      Encrypting... {progress}%
    </p>
  </div>
)}
```

**Step 4: Commit**

```bash
git add src/crypto.ts src/App.tsx
git commit -m "feat: add progress indicator for encryption"
```

---

### Task 4.2: Add Toast Notifications

**Files:**
- Create: `src/components/Toast.tsx`
- Modify: `src/App.tsx`

**Step 1: Create Toast component**

```typescript
import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    info: <CheckCircle2 size={18} className="text-emerald-400" />,
  };

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border ${
        type === 'success' ? 'bg-emerald-900/90 border-emerald-700' :
        type === 'error' ? 'bg-red-900/90 border-red-700' :
        'bg-emerald-900/90 border-emerald-700'
      }`}>
        {icons[type]}
        <span className="text-[13px] text-emerald-100">{message}</span>
        <button onClick={onClose} className="ml-2 text-emerald-400/50 hover:text-emerald-300">
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}

// Toast manager hook
export function useToast() {
  // Implement toast queue management
}
```

**Step 2: Use Toast for copy actions**

```typescript
const [toast, setToast] = useState<{message: string; type: ToastType} | null>(null);

const copyLink = () => {
  if (!shareLink) return;
  navigator.clipboard.writeText(shareLink);
  setToast({ message: 'Link copied!', type: 'success' });
};

const copyKey = () => {
  if (!keyString) return;
  navigator.clipboard.writeText(keyString);
  setToast({ message: 'Key copied!', type: 'success' });
};
```

**Step 3: Render Toast**

```typescript
{toast && <Toast {...toast} onClose={() => setToast(null)} />}
```

**Step 4: Commit**

```bash
git add src/components/Toast.tsx src/App.tsx
git commit -m "feat: add toast notification system"
```

---

### Task 4.3: Update index.html with Meta Tags

**Files:**
- Modify: `index.html`

**Step 1: Update index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- Primary Meta Tags -->
    <title>void.sh - Secure In-Browser File Encryption</title>
    <meta name="title" content="void.sh - Secure In-Browser File Encryption" />
    <meta name="description" content="Zero-knowledge file encryption. Your files, encrypted client-side. Share securely with anyone." />
    
    <!-- Theme -->
    <meta name="theme-color" content="#050b10" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="void.sh - Secure In-Browser File Encryption" />
    <meta property="og:description" content="Zero-knowledge file encryption. Your files, encrypted client-side." />
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Create favicon.svg**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#050b10"/>
  <text x="50" y="65" font-family="monospace" font-size="40" fill="#10b981" text-anchor="middle">V_</text>
</svg>
```

**Step 3: Commit**

```bash
git add index.html public/favicon.svg
git commit -m "chore: add meta tags and custom favicon"
```

---

### Task 4.4: Improve iOS Detection

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update iOS detection**

```typescript
const isIOSLike = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const maxTouchPoints = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints || 0;
  
  return (
    /iP(hone|od|ad)/.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1) ||
    (platform === 'iPad' && maxTouchPoints > 1)
  );
};
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "fix: improve iOS device detection"
```

---

### Task 4.5: Remove Unused Dependency (framer-motion)

**Files:**
- Modify: `package.json`

**Step 1: Remove framer-motion**

```bash
npm uninstall framer-motion
```

**Step 2: Verify no usage**

```bash
grep -r "framer-motion" src/
# Should return nothing
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused framer-motion dependency"
```

---

## Phase 5: Features (Future)

### Task 5.1: Steganography Placeholder Implementation

**Files:**
- Create: `src/steganography.ts` (stub)
- Modify: `src/App.tsx` (enable option)

**Step 1: Create stub implementation**

```typescript
// src/steganography.ts

/**
 * Steganography module - Hide encrypted data inside images
 * 
 * IMPLEMENTATION PLAN:
 * 1. Use LSB (Least Significant Bit) encoding
 * 2. Support PNG images (lossless compression)
 * 3. Use canvas API for pixel manipulation
 * 4. Embed magic bytes to detect stego images
 */

export interface StegoResult {
  imageBlob: Blob;
  originalSize: number;
  capacity: number;
}

export async function hideDataInImage(
  imageFile: File,
  data: ArrayBuffer,
  onProgress?: (p: number) => void
): Promise<StegoResult> {
  throw new Error('STEGANOGRAPHY_NOT_IMPLEMENTED: This feature is coming soon');
}

export async function extractDataFromImage(
  imageFile: File
): Promise<ArrayBuffer> {
  throw new Error('STEGANOGRAPHY_NOT_IMPLEMENTED: This feature is coming soon');
}
```

**Step 2: Enable UI toggle (remove opacity/pointer-events)**

```typescript
// In App.tsx, find the steganography section and remove:
// className="opacity-50 pointer-events-none grayscale"
```

**Step 3: Commit**

```bash
git add src/steganography.ts src/App.tsx
git commit -m "feat: add steganography stub and enable UI toggle"
```

---

### Task 5.2: Multi-file Drag & Drop

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update file state to array**

```typescript
const [files, setFiles] = useState<File[]>([]);
```

**Step 2: Update handlers for multiple files**

```typescript
const handleDropEncrypt = (e: React.DragEvent) => {
  e.preventDefault();
  setIsHoverEncrypt(false);
  const droppedFiles = Array.from(e.dataTransfer.files);
  if (!droppedFiles.length) return;
  
  // Validate and add files
  for (const f of droppedFiles) {
    if (f.size > HARD_MAX_BYTES) {
      setEncryptError(`File ${f.name} too large (> ${HARD_MAX_MB} MB).`);
      return;
    }
  }
  
  setFiles(droppedFiles);
  setStatus('READY');
};
```

**Step 3: Update UI to show multiple files**

```typescript
{files.length > 0 && (
  <div className="space-y-2">
    {files.map((f, i) => (
      <div key={i} className="flex items-center gap-2 bg-emerald-900/20 p-2 rounded">
        <span className="text-[12px] truncate">{f.name}</span>
        <span className="text-[10px] text-emerald-500">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
    ))}
  </div>
)}
```

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add multi-file support"
```

---

## Task 6: Verify & Finalize

### Task 6.1: Run Full Lint Check

**Step 1: Run ESLint**

```bash
npm run lint
# Expected: No errors
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
# Expected: No errors
```

---

### Task 6.2: Run npm audit

**Step 1: Check for vulnerabilities**

```bash
npm audit
# Review and fix any critical/high vulnerabilities
```

---

### Task 6.3: Test Full Flow

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test encrypt/decrypt cycle**

1. Drop a test file
2. Encrypt with random key
3. Download encrypted file
4. Decrypt on DownloadPage
5. Verify file integrity

**Step 3: Test password mode**

1. Enable custom password
2. Encrypt file
3. Test download page password entry
4. Verify decryption with wrong password fails

---

## Summary

| Phase | Tasks | Priority |
|-------|-------|----------|
| 1 - Security | 4 | 🔴 Critical |
| 2 - Bugs | 4 | 🔴 Critical |
| 3 - Security Improvements | 3 | 🟠 High |
| 4 - UX | 5 | 🟡 Medium |
| 5 - Features | 2 | 🟢 Low |
| 6 - Verify | 3 | 🟡 Medium |

**Total: 16 tasks**

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-03-31-security-and-features-plan.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
