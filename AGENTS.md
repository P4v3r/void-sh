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
│   ├── DownloadPage.tsx # Shared link download page
│   ├── main.tsx         # React entry + Router setup
│   ├── crypto.ts        # AES-256-GCM encryption logic
│   ├── supabaseClient.ts
│   └── index.css        # Tailwind imports
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
*   **Routing**: React Router v7

## ENCRYPTION DETAILS

*   **Algorithm**: AES-256-GCM via Web Crypto API
*   **Key Derivation**: PBKDF2 for password-based encryption
*   **Random Keys**: Generated with `crypto.getRandomValues()`
*   **File Format**: `.enc` extension, binary blob storage

## STORAGE INTEGRATIONS

*   **Supabase**: File storage for share links (`vault-files` bucket)
*   **Dropbox**: Direct upload via Dropbox SDK
*   **Local**: Browser download for local-only mode

## WHERE TO LOOK

*   **Source**: `src/App.tsx`, `src/crypto.ts`
*   **Download Logic**: `src/DownloadPage.tsx`
*   **Env Vars**: `.env.local` (Supabase keys, Dropbox app key)

## NOTES

*   **Client-side only**: All encryption happens in browser, zero server-side processing
*   **Share Links**: Key can be embedded in URL hash (`#key`) or separate
*   **Password Mode**: Custom passwords bypass random key generation
*   **File Limits**: 50MB for online upload, 2GB hard limit
*   **iOS Handling**: Uses `window.open()` instead of blob download for iOS devices
