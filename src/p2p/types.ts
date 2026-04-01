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

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

export interface FileChunkMessage {
  type: 'file-meta' | 'file-chunk';
  index?: number;
  data?: number[];
  isLast?: boolean;
  metadata?: FileMetadata;
}
