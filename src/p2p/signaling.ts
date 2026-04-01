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
