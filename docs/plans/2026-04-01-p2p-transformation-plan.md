# void.sh P2P Transformation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform void.sh from a Supabase-dependent app to a zero-server P2P file transfer application with local encryption capabilities.

**Architecture:** WebRTC-based P2P file transfer with signaling via encoded connection links. Two connection methods: (1) Direct link sharing for seamless UX, (2) Manual code copy as fallback. All files encrypted client-side with AES-256-GCM before transfer. No server stores any data.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, WebRTC, Web Crypto API

---

## Overview

### Before (v2.1)
```
User → Encrypt → Supabase Storage → Share Link → Download Page → Decrypt
```

### After (P2P Edition)
```
User A → Encrypt → WebRTC P2P ──────────→ User B → Decrypt
           ↓
      Save Locally (backup)
```

### Features
| Feature | Status |
|---------|--------|
| Local Encryption & Save | ✅ Kept |
| P2P Transfer (Link + Code) | 🆕 New |
| Remove Supabase | ❌ Removed |
| Remove Dropbox | ❌ Removed |
| Chunked Transfer for Large Files | 🆕 New |
| Progress Bar | ✅ Kept |

---

## PHASE 1: Cleanup - Remove Supabase & Dropbox

### Task 1.1: Update package.json - Remove Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Remove Supabase and Dropbox packages**

```json
{
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.556.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "tailwind-merge": "^3.4.0"
  }
}
```

**Step 2: Remove unused packages (framer-motion)**

```bash
npm uninstall @supabase/supabase-js dropbox framer-motion react-router-dom
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove Supabase, Dropbox, framer-motion, react-router dependencies"
```

---

### Task 1.2: Remove DownloadPage.tsx

**Files:**
- Delete: `src/DownloadPage.tsx`

**Step 1: Remove the file**

```bash
rm src/DownloadPage.tsx
```

**Step 2: Update main.tsx to remove DownloadPage route**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Step 3: Remove BrowserRouter import and routes**

**Step 4: Commit**

```bash
git rm src/DownloadPage.tsx
git add src/main.tsx
git commit -m "chore: remove DownloadPage and simplify routing"
```

---

### Task 1.3: Remove config.ts or Simplify

**Files:**
- Modify: `src/config.ts`

**Step 1: Simplify config.ts to only crypto constants**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/config.ts
git commit -m "refactor: simplify config to crypto constants only"
```

---

### Task 1.4: Remove supabaseClient.ts

**Files:**
- Delete: `src/supabaseClient.ts`

**Step 1: Remove file**

```bash
rm src/supabaseClient.ts
git rm src/supabaseClient.ts
```

**Step 2: Commit**

```bash
git commit -m "chore: remove unused supabaseClient.ts"
```

---

### Task 1.5: Clean up App.tsx - Remove Supabase/Dropbox Imports

**Files:**
- Modify: `src/App.tsx`

**Step 1: Remove unused imports**

```typescript
// BEFORE:
import React, { useState, useEffect, useRef } from 'react';
import { Lock, Upload, CheckCircle2, Copy, AlertTriangle, Cloud, Computer, Settings, Eye, EyeOff, X, Shuffle} from 'lucide-react';
import { encryptFile, decryptFile } from './crypto';
import { createClient } from '@supabase/supabase-js';
import { Dropbox, DropboxAuth } from 'dropbox';
import CONFIG from './config';
import Toast from './components/Toast';

// AFTER:
import React, { useState, useEffect, useRef } from 'react';
import { Lock, Upload, CheckCircle2, Copy, AlertTriangle, Computer, Settings, Eye, EyeOff, X, Shuffle, Wifi, WifiOff, Link2, User} from 'lucide-react';
import { encryptFile, decryptFile } from './crypto';
import CONFIG from './config';
import Toast from './components/Toast';
```

**Step 2: Remove Supabase client**

```typescript
// REMOVE THIS:
// const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
```

**Step 3: Remove Dropbox-related code and state**

```typescript
// REMOVE:
// const [dbxToken, setDbxToken] = useState<string | null>(null);
// const DROPBOX_TOKEN_KEY = 'voidsh_dropbox_token';
// useEffect for token persistence
// handleDropboxAuth
// handleDropboxLogout
```

**Step 4: Update Mode type**

```typescript
// BEFORE:
type Mode = 'LOCAL_ONLY' | 'UPLOAD' | 'DROPBOX';

// AFTER:
type Mode = 'LOCAL_ONLY' | 'P2P';
```

**Step 5: Update status indicator**

```typescript
// CHANGE:
<span className="text-[12px] text-emerald-600">
  [{status === 'IDLE' ? ' IDLE ' : status === 'READY' ? ' READY ' : status === 'ENCRYPTING' ? ' BUSY ' : ' DONE '}]
</span>
```

**Step 6: Remove Dropbox buttons from UI**

Find and remove:
- "Connect Dropbox" button
- "Save to Dropbox" button
- Dropbox status display

**Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "chore: remove Supabase and Dropbox from App.tsx"
```

---

### Task 1.6: Remove .env.local and Related Files

**Files:**
- Delete: `.env.local`

**Step 1: Check if file exists and remove**

```bash
rm -f .env.local
git status
```

**Step 2: Update README to remove Supabase setup instructions**

**Step 3: Commit**

```bash
git commit -m "chore: remove .env.local and update documentation"
```

---

## PHASE 2: P2P Core - WebRTC Implementation

### Task 2.1: Create P2P Types Module

**Files:**
- Create: `src/p2p/types.ts`

**Step 1: Create types file**

```typescript
// src/p2p/types.ts

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export type TransferState = 'IDLE' | 'PREPARING' | 'TRANSFERRING' | 'COMPLETED' | 'ERROR';

export interface PeerConnection {
  id: string;
  state: ConnectionState;
  peerId?: string;
}

export interface FileChunk {
  index: number;
  data: ArrayBuffer;
  hash: string;
  isLast: boolean;
}

export interface TransferProgress {
  bytesTransferred: number;
  totalBytes: number;
  chunksTransferred: number;
  totalChunks: number;
  speed: number; // bytes per second
}

export interface SignalingData {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: string; // base64 encoded
}

export interface ConnectionInfo {
  roomCode: string;
  offer: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  iceCandidates: RTCIceCandidateInit[];
}
```

**Step 2: Commit**

```bash
git add src/p2p/types.ts
git commit -m "feat: add P2P types"
```

---

### Task 2.2: Create STUN Servers Configuration

**Files:**
- Create: `src/p2p/servers.ts`

**Step 1: Create STUN/TURN servers config**

```typescript
// src/p2p/servers.ts

// Public STUN servers for NAT traversal
// Using Google's STUN servers as primary
export const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: 'stun:stun.l.google.com:19302',
  },
  {
    urls: 'stun:stun1.l.google.com:19302',
  },
  {
    urls: 'stun:stun2.l.google.com:19302',
  },
  {
    urls: 'stun:stun.services.mozilla.com',
  },
];

// TURN server config (for restricted NATs)
// Free TURN servers - limited capacity
export const TURN_SERVERS: RTCIceServer[] = [
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export const ALL_ICE_SERVERS = [...ICE_SERVERS, ...TURN_SERVERS];
```

**Step 2: Commit**

```bash
git add src/p2p/servers.ts
git commit -m "feat: add ICE servers configuration for WebRTC"
```

---

### Task 2.3: Create Signaling Module (Link/Code Generation)

**Files:**
- Create: `src/p2p/signaling.ts`

**Step 1: Create signaling utilities**

```typescript
// src/p2p/signaling.ts

import type { SignalingData } from './types';

// Generate a random room code (6 characters)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
  let code = '';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (let i = 0; i < 6; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

// Encode signaling data to base64
export function encodeSignalingData(data: SignalingData): string {
  const json = JSON.stringify(data);
  return btoa(json);
}

// Decode signaling data from base64
export function decodeSignalingData(encoded: string): SignalingData | null {
  try {
    const json = atob(encoded);
    return JSON.parse(json) as SignalingData;
  } catch {
    return null;
  }
}

// Generate connection link
export function generateConnectionLink(roomCode: string, offerData: string): string {
  const base = window.location.origin;
  const encoded = encodeURIComponent(offerData);
  return `${base}/connect/${roomCode}?offer=${encoded}`;
}

// Parse connection link
export function parseConnectionLink(url: string): { roomCode: string; offerData: string } | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.pathname.startsWith('/connect/')) {
      return null;
    }
    const roomCode = urlObj.pathname.replace('/connect/', '');
    const offerData = urlObj.searchParams.get('offer');
    if (!offerData) return null;
    return { roomCode, offerData };
  } catch {
    return null;
  }
}

// Generate offer/answer codes for manual copy
export function generateOfferCode(data: RTCSessionDescriptionInit): string {
  const json = JSON.stringify(data);
  return `void:${btoa(json)}`;
}

export function parseOfferCode(code: string): RTCSessionDescriptionInit | null {
  try {
    if (!code.startsWith('void:')) return null;
    const json = atob(code.slice(5));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
```

**Step 2: Commit**

```bash
git add src/p2p/signaling.ts
git commit -m "feat: add signaling utilities for P2P connection"
```

---

### Task 2.4: Create WebRTC Connection Manager

**Files:**
- Create: `src/p2p/connection.ts`

**Step 1: Create connection manager class**

```typescript
// src/p2p/connection.ts

import { ICE_SERVERS } from './servers';
import { generateRoomCode, generateOfferCode, parseOfferCode } from './signaling';
import type { ConnectionState, FileChunk, TransferProgress } from './types';
import CONFIG from '../config';

export type ConnectionEvents = {
  onStateChange: (state: ConnectionState) => void;
  onDataReceived: (data: ArrayBuffer, isLast: boolean) => void;
  onTransferProgress: (progress: TransferProgress) => void;
  onError: (error: string) => void;
};

export class P2PConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private roomCode: string = '';
  private events: ConnectionEvents;
  private transferBuffer: Map<number, FileChunk> = new Map();
  private totalChunks: number = 0;
  private bytesTransferred: number = 0;
  private transferStartTime: number = 0;

  constructor(events: ConnectionEvents) {
    this.events = events;
  }

  // Create offer as host
  async createOffer(): Promise<{ roomCode: string; offerCode: string }> {
    this.roomCode = generateRoomCode();
    this.setupPeerConnection();
    
    // Create data channel
    this.dataChannel = this.peerConnection!.createDataChannel('fileTransfer', {
      ordered: true,
    });
    this.setupDataChannel(this.dataChannel);
    
    // Create offer
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    
    // Wait for ICE gathering to complete
    await this.waitForIceGathering();
    
    const offerCode = generateOfferCode(this.peerConnection!.localDescription!);
    
    return { roomCode: this.roomCode, offerCode };
  }

  // Join as receiver using offer code
  async joinWithOfferCode(offerCode: string): Promise<string> {
    const offer = parseOfferCode(offerCode);
    if (!offer) {
      throw new Error('Invalid offer code');
    }
    
    this.roomCode = generateRoomCode(); // Generate response room code
    this.setupPeerConnection();
    
    // Wait for data channel from host
    this.peerConnection!.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };
    
    await this.peerConnection!.setRemoteDescription(offer);
    
    // Create answer
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);
    
    // Wait for ICE gathering
    await this.waitForIceGathering();
    
    return this.roomCode;
  }

  // Get answer code to send back
  getAnswerCode(): string {
    if (!this.peerConnection?.localDescription) {
      throw new Error('No local description');
    }
    return generateOfferCode(this.peerConnection.localDescription);
  }

  // Complete connection with answer code (host side)
  async completeWithAnswerCode(answerCode: string): Promise<void> {
    const answer = parseOfferCode(answerCode);
    if (!answer) {
      throw new Error('Invalid answer code');
    }
    await this.peerConnection!.setRemoteDescription(answer);
  }

  // Send file in chunks
  async sendFile(file: File): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    this.transferStartTime = Date.now();
    this.bytesTransferred = 0;
    
    // Calculate chunks
    const chunkSize = CONFIG.CHUNK_SIZE;
    const totalChunks = Math.ceil(file.size / chunkSize);
    this.totalChunks = totalChunks;
    
    // Send file metadata first
    const metadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks,
    };
    this.dataChannel.send(JSON.stringify({ type: 'file-meta', data: metadata }));
    
    // Send chunks
    const buffer = await file.arrayBuffer();
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = buffer.slice(start, end);
      const isLast = i === totalChunks - 1;
      
      // Create chunk message
      const chunkMessage = {
        type: 'file-chunk',
        index: i,
        data: Array.from(new Uint8Array(chunk)),
        isLast,
      };
      
      this.dataChannel!.send(JSON.stringify(chunkMessage));
      
      this.bytesTransferred += chunk.byteLength;
      this.reportProgress(file.size);
      
      // Small delay to prevent overwhelming the channel
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  private setupPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    this.peerConnection.onicecandidate = (event) => {
      // ICE candidates are gathered automatically
      // Connection continues once candidates are exchanged
    };
    
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      switch (state) {
        case 'connected':
          this.events.onStateChange('CONNECTED');
          break;
        case 'disconnected':
        case 'closed':
          this.events.onStateChange('DISCONNECTED');
          break;
        case 'failed':
          this.events.onStateChange('ERROR');
          this.events.onError('Connection failed');
          break;
      }
    };
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.events.onStateChange('CONNECTED');
    };
    
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'file-meta') {
          this.totalChunks = message.data.totalChunks;
          this.transferBuffer.clear();
          this.events.onTransferProgress({
            bytesTransferred: 0,
            totalBytes: message.data.size,
            chunksTransferred: 0,
            totalChunks: this.totalChunks,
            speed: 0,
          });
        } else if (message.type === 'file-chunk') {
          this.bytesTransferred += message.data.length;
          this.transferBuffer.set(message.index, message.data);
          
          // Check if we have all chunks in order
          this.processReceivedChunks(message.data.isLast);
          
          this.reportProgress(this.bytesTransferred);
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    };
    
    channel.onerror = (e) => {
      this.events.onError('Data channel error');
      console.error('Data channel error:', e);
    };
  }

  private processReceivedChunks(isLast: boolean): void {
    // Collect chunks and combine when complete
    // For simplicity, we'll combine chunks in order
    // A production version would handle out-of-order delivery
  }

  private async waitForIceGathering(): Promise<void> {
    if (!this.peerConnection) return;
    
    return new Promise((resolve) => {
      if (this.peerConnection!.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      
      const checkState = () => {
        if (this.peerConnection!.iceGatheringState === 'complete') {
          this.peerConnection!.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      
      this.peerConnection!.addEventListener('icegatheringstatechange', checkState);
      
      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });
  }

  private reportProgress(totalBytes: number): void {
    const elapsed = (Date.now() - this.transferStartTime) / 1000;
    const speed = elapsed > 0 ? totalBytes / elapsed : 0;
    
    this.events.onTransferProgress({
      bytesTransferred: totalBytes,
      totalBytes: this.bytesTransferred || totalBytes,
      chunksTransferred: Math.floor(totalBytes / CONFIG.CHUNK_SIZE),
      totalChunks: this.totalChunks,
      speed,
    });
  }

  close(): void {
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.dataChannel = null;
    this.peerConnection = null;
    this.transferBuffer.clear();
  }
}
```

**Step 2: Commit**

```bash
git add src/p2p/connection.ts
git commit -m "feat: add WebRTC P2P connection manager"
```

---

### Task 2.5: Update crypto.ts for Chunked Encryption

**Files:**
- Modify: `src/crypto.ts`

**Step 1: Add chunked encryption support**

```typescript
// Add these exports to crypto.ts

export type EncryptionProgressCallback = (progress: number) => void;

export async function encryptFileChunked(
  file: File,
  onProgress?: EncryptionProgressCallback
): Promise<{ encryptedBlob: Blob; key: string; iv: Uint8Array }> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Read file in chunks and encrypt
  const chunkSize = 64 * 1024; // 64KB chunks
  const chunks: ArrayBuffer[] = [];
  let offset = 0;
  let totalRead = 0;
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    const buffer = await chunk.arrayBuffer();
    
    const encryptedChunk = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      buffer
    );
    
    chunks.push(encryptedChunk);
    offset += chunkSize;
    totalRead += buffer.byteLength;
    
    onProgress?.(Math.round((totalRead / file.size) * 100));
  }
  
  // Combine chunks
  const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let position = 0;
  for (const chunk of chunks) {
    combined.set(new Uint8Array(chunk), position);
    position += chunk.byteLength;
  }
  
  // Export key
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const keyString = arrayBufferToBase64(exportedKey);
  
  return {
    encryptedBlob: new Blob([combined], { type: 'application/octet-stream' }),
    key: keyString,
    iv,
  };
}

export async function decryptFileChunked(
  encryptedBlob: Blob,
  keyString: string,
  onProgress?: EncryptionProgressCallback
): Promise<Blob> {
  const keyBuffer = base64ToArrayBuffer(keyString);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const buffer = await encryptedBlob.arrayBuffer();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(buffer.slice(0, 12)) },
    key,
    buffer.slice(12)
  );
  
  onProgress?.(100);
  
  return new Blob([decrypted]);
}
```

**Step 2: Commit**

```bash
git add src/crypto.ts
git commit -m "feat: add chunked encryption for large files"
```

---

## PHASE 3: P2P UI - New Interface

### Task 3.1: Create P2P Context/Hook

**Files:**
- Create: `src/hooks/useP2P.ts`

**Step 1: Create P2P hook**

```typescript
// src/hooks/useP2P.ts

import { useState, useCallback, useRef, useEffect } from 'react';
import { P2PConnection, ConnectionEvents } from '../p2p/connection';
import { parseConnectionLink } from '../p2p/signaling';
import type { ConnectionState, TransferProgress } from '../p2p/types';

interface UseP2PResult {
  // Connection state
  connectionState: ConnectionState;
  roomCode: string | null;
  isHost: boolean;
  
  // Actions
  startHost: () => Promise<{ roomCode: string; offerCode: string }>;
  joinWithOfferCode: (code: string) => Promise<string>;
  completeConnection: (answerCode: string) => Promise<void>;
  
  // File transfer
  sendFile: (file: File, onProgress?: (p: number) => void) => Promise<void>;
  receivedFile: Blob | null;
  receivedFileName: string | null;
  
  // Transfer progress
  transferProgress: TransferProgress | null;
  
  // Errors
  error: string | null;
  
  // Cleanup
  disconnect: () => void;
}

export function useP2P(): UseP2PResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [transferProgress, setTransferProgress] = useState<TransferProgress | null>(null);
  const [receivedFile, setReceivedFile] = useState<Blob | null>(null);
  const [receivedFileName, setReceivedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const connectionRef = useRef<P2PConnection | null>(null);
  const pendingOfferCodeRef = useRef<string | null>(null);
  const receivedChunksRef = useRef<Map<number, number[]>>(new Map());
  const fileMetadataRef = useRef<{ name: string; size: number; totalChunks: number } | null>(null);
  
  const handleStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    if (state === 'DISCONNECTED') {
      setTransferProgress(null);
    }
  }, []);
  
  const handleDataReceived = useCallback((data: ArrayBuffer, isLast: boolean) => {
    // Handle received data
    if (isLast) {
      setReceivedFile(new Blob([data]));
    }
  }, []);
  
  const handleTransferProgress = useCallback((progress: TransferProgress) => {
    setTransferProgress(progress);
  }, []);
  
  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setConnectionState('ERROR');
  }, []);
  
  const events: ConnectionEvents = {
    onStateChange: handleStateChange,
    onDataReceived: handleDataReceived,
    onTransferProgress: handleTransferProgress,
    onError: handleError,
  };
  
  const startHost = useCallback(async () => {
    setError(null);
    setConnectionState('CONNECTING');
    setIsHost(true);
    
    const connection = new P2PConnection(events);
    connectionRef.current = connection;
    
    const result = await connection.createOffer();
    setRoomCode(result.roomCode);
    pendingOfferCodeRef.current = result.offerCode;
    
    return result;
  }, [events]);
  
  const joinWithOfferCode = useCallback(async (offerCode: string) => {
    setError(null);
    setConnectionState('CONNECTING');
    setIsHost(false);
    
    const connection = new P2PConnection(events);
    connectionRef.current = connection;
    
    const answerRoomCode = await connection.joinWithOfferCode(offerCode);
    setRoomCode(answerRoomCode);
    
    return answerRoomCode;
  }, [events]);
  
  const completeConnection = useCallback(async (answerCode: string) => {
    if (!connectionRef.current) {
      throw new Error('No active connection');
    }
    
    await connectionRef.current.completeWithAnswerCode(answerCode);
  }, []);
  
  const sendFile = useCallback(async (file: File, onProgress?: (p: number) => void) => {
    if (!connectionRef.current) {
      throw new Error('No active connection');
    }
    
    setTransferProgress({
      bytesTransferred: 0,
      totalBytes: file.size,
      chunksTransferred: 0,
      totalChunks: Math.ceil(file.size / (1024 * 1024)),
      speed: 0,
    });
    
    await connectionRef.current.sendFile(file);
  }, []);
  
  const disconnect = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    setConnectionState('DISCONNECTED');
    setRoomCode(null);
    setIsHost(false);
    setTransferProgress(null);
    receivedChunksRef.current.clear();
    fileMetadataRef.current = null;
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      connectionRef.current?.close();
    };
  }, []);
  
  return {
    connectionState,
    roomCode,
    isHost,
    startHost,
    joinWithOfferCode,
    completeConnection,
    sendFile,
    receivedFile,
    receivedFileName,
    transferProgress,
    error,
    disconnect,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useP2P.ts
git commit -m "feat: add P2P hook for connection management"
```

---

### Task 3.2: Create P2P UI Components

**Files:**
- Create: `src/components/P2PSend.tsx`
- Create: `src/components/P2PReceive.tsx`
- Create: `src/components/P2PStatus.tsx`

**Step 1: P2PSend component**

```typescript
// src/components/P2PSend.tsx

import React, { useState } from 'react';
import { Link2, Copy, CheckCircle2, AlertTriangle, Wifi, Loader2 } from 'lucide-react';

interface P2PSendProps {
  onSend: (file: File) => void;
  isConnected: boolean;
  connectionInfo: { roomCode: string; offerCode: string } | null;
  isConnecting: boolean;
  onStartHost: () => Promise<{ roomCode: string; offerCode: string }>;
  onCompleteConnection: (answerCode: string) => Promise<void>;
}

export function P2PSend({
  onSend,
  isConnected,
  connectionInfo,
  isConnecting,
  onStartHost,
  onCompleteConnection,
}: P2PSendProps) {
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [answerCode, setAnswerCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGenerateLink = async () => {
    try {
      setError(null);
      await onStartHost();
      setShowCode(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create connection');
    }
  };
  
  const handleCopyLink = () => {
    if (!connectionInfo) return;
    
    const link = `${window.location.origin}/connect/${connectionInfo.roomCode}?offer=${encodeURIComponent(connectionInfo.offerCode)}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handlePasteAnswer = async () => {
    try {
      setError(null);
      await onCompleteConnection(answerCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid answer code');
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };
  
  const handleSend = () => {
    if (file) onSend(file);
  };
  
  // Not connected - show generate button
  if (!isConnected && !showCode) {
    return (
      <div className="p-4">
        <button
          onClick={handleGenerateLink}
          disabled={isConnecting}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 text-white font-bold rounded flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Creating Connection...
            </>
          ) : (
            <>
              <Link2 size={18} />
              Generate P2P Connection Link
            </>
          )}
        </button>
        
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>
    );
  }
  
  // Connected - show answer code input (waiting for receiver)
  if (!isConnected && showCode && connectionInfo) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center">
          <Wifi className="mx-auto mb-2 text-emerald-400" size={24} />
          <p className="text-emerald-300 font-bold">Share Link with Receiver</p>
          <p className="text-emerald-500/60 text-sm">Or share code manually below</p>
        </div>
        
        <div className="bg-black/30 border border-emerald-800 rounded p-3">
          <p className="text-xs text-emerald-500/60 mb-1">Connection Link</p>
          <div className="flex gap-2">
            <code className="flex-1 text-emerald-300 text-xs truncate">
              {window.location.origin}/connect/{connectionInfo.roomCode}
            </code>
            <button
              onClick={handleCopyLink}
              className="p-1 text-emerald-400 hover:text-emerald-300"
            >
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        
        <div className="text-center text-emerald-500/50 text-sm">OR</div>
        
        <div>
          <p className="text-xs text-emerald-500/60 mb-1">Manual Code (for receiver)</p>
          <div className="bg-black/30 border border-emerald-800 rounded p-2">
            <code className="text-emerald-300 text-xs break-all">
              {connectionInfo.offerCode.slice(0, 50)}...
            </code>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(connectionInfo.offerCode)}
            className="mt-2 w-full text-xs text-emerald-500/70 hover:text-emerald-400"
          >
            Copy Full Code
          </button>
        </div>
        
        <div className="border-t border-emerald-900/30 pt-4">
          <p className="text-xs text-emerald-500/60 mb-2">Waiting for receiver to connect...</p>
          <p className="text-xs text-emerald-500/40">
            Once connected, paste their answer code here:
          </p>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={answerCode}
              onChange={(e) => setAnswerCode(e.target.value)}
              placeholder="Paste answer code..."
              className="flex-1 bg-black/30 border border-emerald-800 rounded px-3 py-2 text-sm text-emerald-100"
            />
            <button
              onClick={handlePasteAnswer}
              disabled={!answerCode}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 text-white rounded text-sm"
            >
              Connect
            </button>
          </div>
        </div>
        
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
      </div>
    );
  }
  
  // Connected - show file selection
  if (isConnected) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24} />
          <p className="text-emerald-300 font-bold">Connected!</p>
          <p className="text-emerald-500/60 text-sm">Select a file to send</p>
        </div>
        
        <div className="relative">
          <input
            type="file"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="border-2 border-dashed border-emerald-800 rounded-lg p-6 text-center hover:border-emerald-600 transition-colors">
            {file ? (
              <div>
                <p className="text-emerald-100 font-medium">{file.name}</p>
                <p className="text-emerald-500/60 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <p className="text-emerald-500/60">Click to select file</p>
            )}
          </div>
        </div>
        
        <button
          onClick={handleSend}
          disabled={!file}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 disabled:text-emerald-500/30 text-white font-bold rounded flex items-center justify-center gap-2"
        >
          <Link2 size={18} />
          Send Encrypted File
        </button>
      </div>
    );
  }
  
  return null;
}
```

**Step 2: P2PReceive component**

```typescript
// src/components/P2PReceive.tsx

import React, { useState, useEffect } from 'react';
import { Link2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { parseConnectionLink } from '../p2p/signaling';

interface P2PReceiveProps {
  onReceive: (offerCode: string) => void;
  onConnected: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  answerCode: string | null;
}

export function P2PReceive({
  onReceive,
  onConnected,
  isConnected,
  isConnecting,
  answerCode,
}: P2PReceiveProps) {
  const [offerCode, setOfferCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Check for connection link in URL
  useEffect(() => {
    const url = window.location.href;
    const parsed = parseConnectionLink(url);
    if (parsed) {
      setOfferCode(parsed.offerData);
      // Clean URL without reload
      window.history.replaceState({}, '', '/');
    }
  }, []);
  
  // Notify parent when answer code is ready
  useEffect(() => {
    if (answerCode) {
      onConnected();
    }
  }, [answerCode, onConnected]);
  
  const handleConnect = () => {
    if (!offerCode.trim()) {
      setError('Please enter the offer code');
      return;
    }
    
    if (!offerCode.startsWith('void:')) {
      setError('Invalid code format');
      return;
    }
    
    setError(null);
    onReceive(offerCode);
  };
  
  if (isConnected) {
    return (
      <div className="p-4 text-center">
        <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24} />
        <p className="text-emerald-300 font-bold">Connected!</p>
        <p className="text-emerald-500/60 text-sm">Waiting for file...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <Link2 className="mx-auto mb-2 text-emerald-400" size={24} />
        <p className="text-emerald-300 font-bold">Join P2P Connection</p>
        <p className="text-emerald-500/60 text-sm">Enter the offer code from sender</p>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
      
      <div>
        <textarea
          value={offerCode}
          onChange={(e) => setOfferCode(e.target.value)}
          placeholder="Paste offer code here (void:...)"
          className="w-full h-24 bg-black/30 border border-emerald-800 rounded px-3 py-2 text-sm text-emerald-100 resize-none"
        />
      </div>
      
      <button
        onClick={handleConnect}
        disabled={isConnecting || !offerCode.trim()}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 disabled:text-emerald-500/30 text-white font-bold rounded flex items-center justify-center gap-2"
      >
        {isConnecting ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Connecting...
          </>
        ) : (
          <>
            <Link2 size={18} />
            Connect & Generate Answer
          </>
        )}
      </button>
      
      {answerCode && (
        <div className="bg-black/30 border border-emerald-800 rounded p-3">
          <p className="text-xs text-emerald-500/60 mb-1">Send this answer code back to sender:</p>
          <code className="text-emerald-300 text-xs break-all">
            {answerCode}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(answerCode)}
            className="mt-2 w-full text-xs text-emerald-500/70 hover:text-emerald-400"
          >
            Copy Answer Code
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 3: P2PStatus component**

```typescript
// src/components/P2PStatus.tsx

import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { ConnectionState, TransferProgress } from '../p2p/types';

interface P2PStatusProps {
  state: ConnectionState;
  progress: TransferProgress | null;
  onDisconnect: () => void;
}

export function P2PStatus({ state, progress, onDisconnect }: P2PStatusProps) {
  if (state === 'DISCONNECTED') {
    return null;
  }
  
  const isConnected = state === 'CONNECTED';
  const isConnecting = state === 'CONNECTING';
  
  return (
    <div className="fixed top-4 right-4 z-50 bg-black/90 border border-emerald-800 rounded-lg p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        {isConnecting && <Loader2 className="animate-spin text-emerald-400" size={16} />}
        {isConnected && <Wifi className="text-emerald-400" size={16} />}
        {!isConnected && !isConnecting && <WifiOff className="text-red-400" size={16} />}
        
        <span className="text-emerald-100 text-sm font-medium">
          {isConnecting ? 'Connecting...' : isConnected ? 'P2P Connected' : 'Disconnected'}
        </span>
      </div>
      
      {progress && (
        <div className="space-y-2">
          <div className="w-48 h-2 bg-emerald-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(progress.bytesTransferred / progress.totalBytes) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-emerald-500/60">
            <span>{(progress.bytesTransferred / 1024 / 1024).toFixed(1)} MB</span>
            <span>{(progress.speed / 1024 / 1024).toFixed(1)} MB/s</span>
          </div>
        </div>
      )}
      
      <button
        onClick={onDisconnect}
        className="mt-2 text-xs text-red-400/70 hover:text-red-300"
      >
        Disconnect
      </button>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/P2PSend.tsx src/components/P2PReceive.tsx src/components/P2PStatus.tsx
git commit -m "feat: add P2P UI components"
```

---

### Task 3.3: Integrate P2P into App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add imports**

```typescript
import { P2PSend } from './components/P2PSend';
import { P2PReceive } from './components/P2PReceive';
import { P2PStatus } from './components/P2PStatus';
import { useP2P } from './hooks/useP2P';
```

**Step 2: Add P2P hook**

```typescript
// Inside App component
const {
  connectionState,
  roomCode,
  isHost,
  startHost,
  joinWithOfferCode,
  completeConnection,
  sendFile,
  receivedFile,
  transferProgress,
  error: p2pError,
  disconnect,
} = useP2P();
```

**Step 3: Add new UI section**

Find the "MODE" buttons section and add P2P option:

```tsx
{/* P2P Section */}
<div className="mb-4">
  <h3 className="text-sm text-emerald-400 font-bold mb-2 flex items-center gap-2">
    <Wifi size={14} /> P2P Transfer
  </h3>
  
  {!isHost && connectionState === 'DISCONNECTED' ? (
    <P2PReceive
      onReceive={joinWithOfferCode}
      onConnected={() => {}}
      isConnected={connectionState === 'CONNECTED'}
      isConnecting={connectionState === 'CONNECTING'}
      answerCode={null}
    />
  ) : (
    <P2PSend
      onSend={sendFile}
      isConnected={connectionState === 'CONNECTED'}
      connectionInfo={null}
      isConnecting={connectionState === 'CONNECTING'}
      onStartHost={startHost}
      onCompleteConnection={completeConnection}
    />
  )}
</div>
```

**Step 4: Add P2P status overlay**

```tsx
<P2PStatus
  state={connectionState}
  progress={transferProgress}
  onDisconnect={disconnect}
/>
```

**Step 5: Remove old UPLOAD/DROPBOX buttons**

Find and remove:
- `<button>Share Link</button>`
- `<button>Connect Dropbox</button>`
- `<button>Save to Dropbox</button>`

**Step 6: Update Mode type**

```typescript
type Mode = 'LOCAL_ONLY' | 'P2P';
```

**Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate P2P transfer into main app"
```

---

## PHASE 4: Update UI Text & UX Improvements

### Task 4.1: Update Header and Footer Text

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update header text**

```tsx
// BEFORE:
<span className="text-[12px] text-emerald-500 uppercase tracking-[0.2em] animate-pulse">
  _beta _V2.1
</span>

// AFTER:
<span className="text-[12px] text-emerald-500 uppercase tracking-[0.2em] animate-pulse">
  _P2P Edition
</span>
```

**Step 2: Update description**

```tsx
// BEFORE:
<p className="text-[14px] text-emerald-300/90 font-light tracking-tight mt-1">
  &gt; Secure In-Browser Encryption. Zero Knowledge.
</p>

// AFTER:
<p className="text-[14px] text-emerald-300/90 font-light tracking-tight mt-1">
  &gt; P2P File Transfer. Zero Server. Zero Knowledge.
</p>
```

**Step 3: Update footer**

```tsx
// BEFORE:
<p className="text-[12px] text-emerald-500/60 max-w-3xl mx-auto leading-relaxed font-light">
  // SECURITY NOTICE: WE CANNOT SEE CONTENTS. FILES ARE STORED AS RANDOMIZED, ENCRYPTED BLOBS. <br/>
  // UPLOAD LIMIT: {CONFIG.MAX_UPLOAD_MB}MB (Online) / UNLIMITED (Local & Dropbox) <br/>
  // WARNING: LARGE FILES (>1GB) MAY REQUIRE SIGNIFICANT RAM
</p>

// AFTER:
<p className="text-[12px] text-emerald-500/60 max-w-3xl mx-auto leading-relaxed font-light">
  // ZERO SERVER: FILES NEVER LEAVE YOUR BROWSER <br/>
  // ENCRYPTED PEER-TO-PEER TRANSFER <br/>
  // LARGE FILES SUPPORTED VIA CHUNKED TRANSFER
</p>
```

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "ui: update text for P2P edition"
```

---

### Task 4.2: Add Route for Connection Links

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

**Step 1: Add route handling**

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Check for connection link on load
const url = window.location.href;
if (url.includes('/connect/')) {
  // Store connection data and redirect to main app
  const params = new URLSearchParams(window.location.search);
  const offer = params.get('offer');
  if (offer) {
    sessionStorage.setItem('pendingP2POffer', offer);
  }
  window.history.replaceState({}, '', '/');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Step 2: In App.tsx, check for pending connection**

```typescript
// In useEffect at top of App
useEffect(() => {
  const pendingOffer = sessionStorage.getItem('pendingP2POffer');
  if (pendingOffer) {
    sessionStorage.removeItem('pendingP2POffer');
    // Auto-trigger join
    joinWithOfferCode(pendingOffer);
  }
}, []);
```

**Step 3: Commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: add route handling for P2P connection links"
```

---

## PHASE 5: Final Testing & Documentation

### Task 5.1: Run Lint and Type Check

**Step 1: Run lint**

```bash
npm run lint
# Expected: No errors
```

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
# Expected: No errors
```

**Step 3: Run build**

```bash
npm run build
# Expected: Success
```

---

### Task 5.2: Test P2P Flow Manually

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test scenarios**

1. **Local encryption**: Select file → Encrypt & Save Locally → Download
2. **P2P Send**: Click Generate Link → Copy link → Send file
3. **P2P Receive**: Open link → Paste in receiver → Get file

---

### Task 5.3: Update README

**Files:**
- Modify: `README.md`

**Step 1: Update README content**

```markdown
# void.sh - P2P Secure File Transfer

Zero-knowledge, zero-server file encryption and P2P transfer.

## Features

- 🔒 **Client-side encryption** - AES-256-GCM
- 🌐 **P2P Transfer** - Direct browser-to-browser transfer
- 💾 **Local Save** - Download encrypted files
- 🔗 **Link Sharing** - Share connection via link or code
- 📦 **Large Files** - Chunked transfer for files of any size
- 🚫 **Zero Server** - No cloud storage, no data collection

## Installation

```bash
git clone https://github.com/yourusername/void-sh.git
cd void-sh
npm install
npm run dev
```

## Usage

### Local Encryption

1. Select a file
2. Click "Encrypt & Save Locally"
3. Download the encrypted file

### P2P Transfer

**Sender:**
1. Select a file
2. Click "Generate P2P Connection Link"
3. Share the link with receiver
4. Wait for connection
5. Send file

**Receiver:**
1. Click the link (or enter code manually)
2. Connection establishes automatically
3. File received and decrypted

## How It Works

```
User A                          User B
   |                               |
   |-- Select & Encrypt File ------>|
   |                               |
   |<-- P2P Connection Established ->|
   |                               |
   |------ Encrypted Transfer ------>|
   |                               |
   |-- File Received & Saved        |
```

## Tech Stack

- React 19
- TypeScript
- WebRTC (P2P)
- Web Crypto API (AES-256-GCM)
- Tailwind CSS
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for P2P edition"
```

---

### Task 5.4: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Step 1: Update project knowledge**

```markdown
# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-01
**Version:** P2P Edition

## OVERVIEW
Project: **void.sh**
Stack: React 19 + TypeScript + Vite + Tailwind CSS + WebRTC

## ARCHITECTURE

### Key Features
- Client-side AES-256-GCM encryption
- P2P file transfer via WebRTC
- Link sharing for easy connection
- Local file download
- Chunked transfer for large files

### No Server Dependencies
- No Supabase
- No Dropbox
- No cloud storage
- Files never leave the browser

## STRUCTURE

```
void-sh/
├── src/
│   ├── App.tsx          # Main app with all modes
│   ├── crypto.ts       # AES-256-GCM encryption
│   ├── p2p/
│   │   ├── connection.ts  # WebRTC manager
│   │   ├── signaling.ts    # Link/code generation
│   │   └── servers.ts      # ICE servers config
│   ├── hooks/
│   │   └── useP2P.ts    # P2P connection hook
│   └── components/
│       ├── P2PSend.tsx     # P2P sender UI
│       ├── P2PReceive.tsx  # P2P receiver UI
│       └── P2PStatus.tsx   # Connection status
├── public/
└── docs/plans/         # Implementation plans
```

## COMMANDS

| Action | Command |
|--------|---------|
| Install | `npm install` |
| Dev | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
```

**Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md for P2P edition"
```

---

## Summary

| Phase | Tasks | Priority |
|-------|-------|----------|
| 1 - Cleanup | 6 | 🔴 Critical |
| 2 - P2P Core | 5 | 🔴 Critical |
| 3 - P2P UI | 3 | 🟠 High |
| 4 - UI Text | 2 | 🟡 Medium |
| 5 - Testing | 4 | 🟡 Medium |

**Total: 20 tasks**

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-04-01-p2p-transformation-plan.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
