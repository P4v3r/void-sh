// src/p2p/signaling.ts

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => CHARS[b % CHARS.length]).join('');
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUtf8(str: string): string {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function generateOfferCode(data: RTCSessionDescriptionInit): string {
  const json = JSON.stringify(data);
  return `void:${utf8ToBase64(json)}`;
}

export function parseOfferCode(code: string): RTCSessionDescriptionInit | null {
  try {
    if (!code.startsWith('void:')) return null;
    const json = base64ToUtf8(code.slice(5));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Hash-based URLs so SPA always loads (no server routing needed)
export function generateConnectionLink(roomCode: string, offerCode: string): string {
  return `${window.location.origin}/#connect/${roomCode}?offer=${encodeURIComponent(offerCode)}`;
}

export function parseConnectionLink(url: string): { roomCode: string; offerCode: string } | null {
  try {
    // Check hash first (SPA mode)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hash = url.slice(hashIndex + 1);
      const hashUrl = new URL(`${window.location.origin}/${hash}`);
      if (hashUrl.pathname.startsWith('/connect/')) {
        const roomCode = hashUrl.pathname.replace('/connect/', '');
        const offerCode = hashUrl.searchParams.get('offer');
        if (offerCode) return { roomCode, offerCode };
      }
    }
    // Also check path (for dev server with catch-all)
    const urlObj = new URL(url);
    if (urlObj.pathname.startsWith('/connect/')) {
      const roomCode = urlObj.pathname.replace('/connect/', '');
      const offerCode = urlObj.searchParams.get('offer');
      if (offerCode) return { roomCode, offerCode };
    }
    return null;
  } catch {
    return null;
  }
}
