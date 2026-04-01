// src/p2p/connection.ts

import { ICE_SERVERS } from './servers';
import { generateRoomCode, generateOfferCode, parseOfferCode } from './signaling';
import type { ConnectionState, TransferProgress, FileMetadata, FileChunkMessage } from './types';
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
  private receivedChunks: { data: number[]; isLast: boolean }[] = [];
  private totalChunks: number = 0;
  private bytesTransferred: number = 0;
  private transferStartTime: number = 0;
  private fileSize: number = 0;
  private fileName: string = '';

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
    this.fileSize = file.size;
    this.fileName = file.name;
    
    // Send file metadata first
    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks,
    };
    
    const metaMessage: FileChunkMessage = {
      type: 'file-meta',
      metadata,
    };
    this.dataChannel.send(JSON.stringify(metaMessage));
    
    // Send chunks
    const buffer = await file.arrayBuffer();
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = buffer.slice(start, end);
      const isLast = i === totalChunks - 1;
      
      // Create chunk message
      const chunkMessage: FileChunkMessage = {
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
    
    this.peerConnection.onicecandidate = (_event) => {
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
            data: message.data,
            isLast: message.isLast ?? false,
          });
          
          // Sort chunks by index to ensure correct order
          this.receivedChunks.sort((a, b) => {
            // Find the indices
            const aIndex = this.receivedChunks.indexOf(a);
            const bIndex = this.receivedChunks.indexOf(b);
            return aIndex - bIndex;
          });
          
          this.bytesTransferred += message.data.length;
          
          // Check if we have all chunks
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
    // Combine all chunks in order
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
      
      // Timeout after 5 seconds
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

  close(): void {
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.dataChannel = null;
    this.peerConnection = null;
    this.receivedChunks = [];
  }
}
