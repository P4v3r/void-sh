// src/p2p/signaling.ts

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => CHARS[b % CHARS.length]).join('');
}

// Hash-based URLs so SPA always loads (no server routing needed)
export function generateConnectionLink(roomCode: string): string {
  return `${window.location.origin}/#join/${roomCode}`;
}

export function parseConnectionLink(url: string): { roomCode: string; mode: 'join' } | null {
  try {
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hash = url.slice(hashIndex + 1);
      const hashUrl = new URL(`${window.location.origin}/${hash}`);
      if (hashUrl.pathname.startsWith('/join/')) {
        const roomCode = hashUrl.pathname.replace('/join/', '');
        if (roomCode.length === 6) return { roomCode, mode: 'join' };
      }
    }
    return null;
  } catch {
    return null;
  }
}
