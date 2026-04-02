# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-31

## OVERVIEW
Project: **void.sh**
Stack: React 19 + TypeScript + Vite + Tailwind CSS

## STRUCTURE

```
void-sh/
├── src/
│   ├── App.tsx          # Main UI: encrypt/decrypt panels
│   ├── main.tsx         # React entry point
│   ├── crypto.ts        # AES-256-GCM chunked encryption logic
│   ├── config.ts        # Constants (chunk size, iterations, etc.)
│   └── index.css        # Tailwind imports + base styles
├── public/              # Static assets
├── index.html           # Entry HTML
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.node.json
└── eslint.config.js
```

*   `src/`: React source code
*   `public/`: Static files
*   `src/App.tsx`: Main component with all encryption/decryption logic
*   `src/crypto.ts`: Web Crypto API wrapper for AES-256-GCM

## COMMANDS

| Action | Command |
|--------|---------|
| Install | `npm install` |
| Dev | `npm run dev` |
| Build | `npm run build` |
| Preview | `npm run preview` |
| Lint | `npm run lint` |

## CODING STANDARDS

*   **Language**: TypeScript (strict mode)
*   **Style**: Tailwind CSS with emerald/terminal aesthetic
*   **UI Pattern**: Functional components with hooks
*   **State**: React useState/useEffect
*   **Routing**: None — single page app

## ENCRYPTION DETAILS

*   **Algorithm**: AES-256-GCM via Web Crypto API
*   **Key Derivation**: PBKDF2 for password-based encryption
*   **Random Keys**: Generated with `crypto.getRandomValues()`
*   **File Format**: `.enc` extension, chunked binary storage (4MB chunks)
*   **Chunk Format**: Each chunk encrypted with its own IV, header stores chunk count + all IVs

## WHERE TO LOOK

*   **Source**: `src/App.tsx`, `src/crypto.ts`, `src/config.ts`

## NOTES

*   **Client-side only**: All encryption happens in browser, zero server-side processing
*   **Password Mode**: Custom passwords bypass random key generation
*   **Large Files**: Chunked encryption keeps memory usage constant (~4MB regardless of file size)
*   **iOS Handling**: Uses `window.open()` instead of blob download for iOS devices
