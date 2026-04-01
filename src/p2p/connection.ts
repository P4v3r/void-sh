// src/p2p/connection.ts

import { ICE_SERVERS } from './servers';
import { generateRoomCode } from './signaling';
import { db, ref, onValue, set, remove, get } from '../firebase';
import type { ConnectionState, TransferProgress, FileChunkMessage } from './types';
import CONFIG from '../config';

export type ConnectionEvents = {
  onStateChange: (state: ConnectionState) => void;
  onDataReceived: (data: Blob, fileName: string) => void;
  onTransferProgress: (progress: TransferProgress) => void;
  onError: (error: string) => void;
};

export class P2PConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private roomCode: string = '';
  private events: ConnectionEvents;
  private receivedChunks: { index: number; data: number[]; isLast: boolean }[] = [];
  private totalChunks: number = 0;
  private bytesTransferred: number = 0;
  private transferStartTime: number = 0;
  private fileSize: number = 0;
  private fileName: string = '';
  private listeners: Array<() => void> = [];

  constructor(events: ConnectionEvents) {
    this.events = events;
  }

  // Create offer as host
  async createOffer(): Promise<{ roomCode: string }> {
    this.roomCode = generateRoomCode();
    this.setupPeerConnection();

    this.dataChannel = this.peerConnection!.createDataChannel('fileTransfer', { ordered: true });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    await this.waitForIceGathering();

    // Write offer to Firebase
    const localDesc = this.peerConnection!.localDescription!;
    await set(ref(db, `rooms/${this.roomCode}/offer`), {
      type: localDesc.type,
      sdp: localDesc.sdp,
    });

    // Listen for answer
    this.listenForAnswer();

    // Send ICE candidates as they arrive
    this.sendIceCandidates('host');

    return { roomCode: this.roomCode };
  }

  // Join as receiver
  async joinRoom(roomCode: string): Promise<void> {
    this.roomCode = roomCode;
    this.setupPeerConnection();

    // Wait for data channel from host
    this.peerConnection!.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };

    // Read offer from Firebase
    const offerSnap = await get(ref(db, `rooms/${roomCode}/offer`));
    if (!offerSnap.exists()) {
      throw new Error('Room not found or expired');
    }

    const offerData = offerSnap.val();
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offerData));

    // Listen for ICE candidates from host
    this.listenForIceCandidates('host');

    // Create answer
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);
    await this.waitForIceGathering();

    // Write answer to Firebase
    const localDesc = this.peerConnection!.localDescription!;
    await set(ref(db, `rooms/${roomCode}/answer`), {
      type: localDesc.type,
      sdp: localDesc.sdp,
    });

    // Send ICE candidates
    this.sendIceCandidates('guest');
  }

  private listenForAnswer(): void {
    const answerRef = ref(db, `rooms/${this.roomCode}/answer`);
    const unsub = onValue(answerRef, async (snapshot) => {
      if (!snapshot.exists() || !this.peerConnection) return;
      const answerData = snapshot.val();
      unsub();
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerData));
    });
    this.listeners.push(unsub);
  }

  private listenForIceCandidates(from: 'host' | 'guest'): void {
    const path = `rooms/${this.roomCode}/ice/${from}`;
    const unsub = onValue(ref(db, path), (snapshot) => {
      if (!snapshot.exists() || !this.peerConnection) return;
      const candidates = snapshot.val();
      if (Array.isArray(candidates)) {
        candidates.forEach(async (c: RTCIceCandidateInit) => {
          try {
            await this.peerConnection!.addIceCandidate(new RTCIceCandidate(c));
          } catch {
            // ignore bad candidates
          }
        });
      }
    });
    this.listeners.push(unsub);
  }

  private sendIceCandidates(role: 'host' | 'guest'): void {
    const path = `rooms/${this.roomCode}/ice/${role}`;
    const candidates: RTCIceCandidateInit[] = [];

    this.peerConnection!.onicecandidate = (event) => {
      if (event.candidate) {
        candidates.push(event.candidate.toJSON());
        set(ref(db, path), candidates);
      }
    };
  }

  async sendFile(file: File): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    this.transferStartTime = Date.now();
    this.bytesTransferred = 0;

    const chunkSize = CONFIG.CHUNK_SIZE;
    const totalChunks = Math.ceil(file.size / chunkSize);
    this.totalChunks = totalChunks;
    this.fileSize = file.size;
    this.fileName = file.name;

    const metaMessage: FileChunkMessage = {
      type: 'file-meta',
      metadata: { name: file.name, size: file.size, type: file.type, totalChunks },
    };
    this.dataChannel.send(JSON.stringify(metaMessage));

    const buffer = await file.arrayBuffer();
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = buffer.slice(start, end);
      const isLast = i === totalChunks - 1;

      const chunkMessage: FileChunkMessage = {
        type: 'file-chunk',
        index: i,
        data: Array.from(new Uint8Array(chunk)),
        isLast,
      };

      this.dataChannel.send(JSON.stringify(chunkMessage));
      this.bytesTransferred += chunk.byteLength;
      this.reportProgress(file.size);

      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  private setupPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      switch (state) {
        case 'connected':
          this.events.onStateChange('CONNECTED');
          this.cleanupFirebase();
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
        const message: FileChunkMessage = JSON.parse(event.data);

        if (message.type === 'file-meta' && message.metadata) {
          this.totalChunks = message.metadata.totalChunks;
          this.fileSize = message.metadata.size;
          this.fileName = message.metadata.name;
          this.receivedChunks = [];
          this.bytesTransferred = 0;

          this.events.onTransferProgress({
            bytesTransferred: 0,
            totalBytes: message.metadata.size,
            chunksTransferred: 0,
            totalChunks: this.totalChunks,
            speed: 0,
          });
        } else if (message.type === 'file-chunk' && message.data !== undefined && message.index !== undefined) {
          this.receivedChunks.push({
            index: message.index,
            data: message.data,
            isLast: message.isLast ?? false,
          });

          this.receivedChunks.sort((a, b) => a.index - b.index);
          this.bytesTransferred += message.data.length;

          if (message.isLast && this.receivedChunks.length === this.totalChunks) {
            this.processReceivedFile();
          }

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

  private processReceivedFile(): void {
    const allData: number[] = [];
    for (const chunk of this.receivedChunks) {
      allData.push(...chunk.data);
    }

    const blob = new Blob([new Uint8Array(allData)], { type: 'application/octet-stream' });
    this.events.onDataReceived(blob, this.fileName);
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
      setTimeout(resolve, 5000);
    });
  }

  private reportProgress(totalBytes: number): void {
    const elapsed = (Date.now() - this.transferStartTime) / 1000;
    const speed = elapsed > 0 ? totalBytes / elapsed : 0;

    this.events.onTransferProgress({
      bytesTransferred: totalBytes,
      totalBytes: this.fileSize || totalBytes,
      chunksTransferred: Math.floor(totalBytes / CONFIG.CHUNK_SIZE),
      totalChunks: this.totalChunks,
      speed,
    });
  }

  private cleanupFirebase(): void {
    this.listeners.forEach(unsub => unsub());
    this.listeners = [];
    remove(ref(db, `rooms/${this.roomCode}`));
  }

  close(): void {
    this.cleanupFirebase();
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.dataChannel = null;
    this.peerConnection = null;
    this.receivedChunks = [];
  }
}
