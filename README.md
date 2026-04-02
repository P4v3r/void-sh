# void.sh

**In-browser file encryption with AES-256-GCM.** Zero knowledge, zero server processing, zero dependencies on external services. All encryption happens entirely in your browser — your files never leave your machine.

![void.sh UI](./public/favicon.svg)

## Features

- **AES-256-GCM encryption** — Industry-standard authenticated encryption via the Web Crypto API
- **Chunk-based processing** — Files are encrypted in 4MB chunks, keeping memory usage constant regardless of file size. No practical file size limit.
- **Two key modes** — Choose between a cryptographically secure random key or a custom password (PBKDF2 key derivation with 310,000 iterations)
- **Client-side only** — No server, no API calls, no data collection. Everything runs locally in your browser
- **Drag & drop interface** — Simple terminal-inspired UI for quick encryption and decryption
- **Privacy options** — Randomize filenames, hide file extensions, and toggle password visibility
- **iOS compatible** — Download handling adapted for Safari on iOS devices

## How It Works

### Encryption

1. Drop a file into the **Encrypt** panel (or click to browse)
2. Optionally enable **Advanced Options** to set a custom password, randomize the filename, or hide the `.enc` extension
3. Click **Encrypt & Download** — the encrypted `.enc` file downloads automatically
4. **Save the decryption key or password** — you'll need it to decrypt the file later

### Decryption

1. Drop the `.enc` file into the **Decrypt** panel
2. Paste the decryption key or enter the password
3. Click **Decrypt File** — the original file is restored and downloaded

### Sharing Securely

For maximum security, share the encrypted file and the key/password through **separate channels** (e.g., send the file via email and the password via a different messaging app).

## Advanced Options

| Option | Description |
|--------|-------------|
| **Custom Password** | Use your own password instead of a random key. The password is processed through PBKDF2 (310,000 iterations, SHA-256) for key derivation. |
| **Random Filename** | Replaces the original filename with a random string (e.g., `x8k29a.enc`) to prevent metadata leakage. |
| **Obscurity (.bin)** | Saves the encrypted file with a `.bin` extension instead of `.enc` to avoid drawing attention. |

## Security Details

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-256-GCM (authenticated encryption) |
| Key Derivation | PBKDF2 with SHA-256 |
| PBKDF2 Iterations | 310,000 |
| Salt Length | 16 bytes (random, per encryption) |
| IV Length | 12 bytes (random, per chunk) |
| Chunk Size | 4 MB |
| File Size Limit | None — memory stays constant at ~4MB |

### Encryption Format

Encrypted files (`.enc`) use the following structure:

**Password mode:**
```
[SALT 16B] [IV_0 12B] [IV_1 12B] ... [IV_N 12B] [ENCRYPTED_CHUNK_0] [ENCRYPTED_CHUNK_1] ...
```

**Random key mode:**
```
[IV_0 12B] [IV_1 12B] ... [IV_N 12B] [ENCRYPTED_CHUNK_0] [ENCRYPTED_CHUNK_1] ...
```

Each chunk is encrypted independently with its own IV. This keeps memory usage at ~4MB regardless of file size, enabling encryption of large files without browser crashes.

### Important Warnings

- **There is no recovery.** If you lose the key or password, the file is permanently unrecoverable.
- **AES-GCM authentication.** If the encrypted file is tampered with or corrupted, decryption will fail with an error — no partial or corrupted output is produced.
- **No server-side storage.** Your files and keys are never transmitted to any server.

## Tech Stack

- **React 19** + **TypeScript** (strict mode)
- **Vite 7** (build tool)
- **Tailwind CSS 3** (styling)
- **Lucide React** (icons)
- **Web Crypto API** (encryption — built into all modern browsers, no external library)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

### Installation

```bash
git clone https://github.com/your-username/void-sh.git
cd void-sh
npm install
```

### Development

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Production Build

```bash
npm run build
```

The optimized output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## FAQ

**Q: Can I recover a file if I lose the key or password?**
A: No. There is no backdoor, no server-side storage, and no recovery mechanism. If you lose the key/password, the file is permanently lost.

**Q: Is there a file size limit?**
A: No. Files are processed in 4MB chunks, so memory usage stays constant at ~4MB regardless of file size. You can encrypt files of any size.

**Q: How does the password mode differ from the random key mode?**
A: In random key mode, a cryptographically secure 256-bit key is generated and exported as a base64 string. In password mode, your password is processed through PBKDF2 (310,000 iterations) to derive the encryption key. Password mode is more convenient (easier to remember), but random keys are stronger against brute-force attacks.

**Q: Can someone tamper with my encrypted file without me knowing?**
A: No. AES-256-GCM provides authenticated encryption. If the encrypted file is modified in any way, decryption will fail with an error.

**Q: Does the website track or store anything about me?**
A: No. There is no analytics, no tracking, no server-side processing, and no cookies. The entire application runs in your browser.

**Q: What happens if I close the browser during encryption?**
A: The encryption is interrupted and no file is produced. Simply start over.

**Q: Why does the encrypted file have a different size than the original?**
A: AES-GCM adds a 16-byte authentication tag per chunk. For large files, this overhead is negligible (~16 bytes per 4MB chunk).

**Q: Can I use this offline?**
A: Yes. Once the page is loaded, all encryption and decryption happens locally with no network requests.

## License

[MIT License](LICENSE)
