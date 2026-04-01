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
