# void.sh

In-browser file encryption with AES-256-GCM. Zero knowledge, zero server processing.

## Features

- **AES-256-GCM encryption** entirely in the browser
- **Random keys** or **custom passwords** (PBKDF2 key derivation)
- **Chunk-based encryption** for large files with constant memory usage (~4MB)
- **No server-side processing** — files never leave your machine
- **No user logs** — no tracking, no analytics

## How it works

1. Drop a file in the Encrypt panel
2. Choose a random key or set a custom password
3. Click "Encrypt & Download" — the `.enc` file downloads instantly
4. Share the `.enc` file and the key/password separately

To decrypt, drop the `.enc` file in the Decrypt panel and paste the key or password.

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 3
- Web Crypto API (AES-256-GCM, PBKDF2)

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Security

- Algorithm: AES-256-GCM via Web Crypto API
- Key derivation: PBKDF2 with 310,000 iterations (SHA-256)
- Large files are encrypted in 4MB chunks, each with its own IV
- All encryption/decryption happens client-side — the server never sees your files or keys
