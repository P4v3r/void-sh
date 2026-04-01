// src/hooks/useP2P.ts

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { P2PConnection, type ConnectionEvents } from '../p2p/connection';
import { parseConnectionLink } from '../p2p/signaling';
import type { ConnectionState, TransferProgress } from '../p2p/types';

interface UseP2PResult {
  connectionState: ConnectionState;
  roomCode: string | null;
  isHost: boolean;
  offerCode: string | null;
  answerCode: string | null;
  startHost: () => Promise<{ roomCode: string; offerCode: string }>;
  joinWithOfferCode: (code: string) => Promise<void>;
  completeConnection: (answerCode: string) => Promise<void>;
  sendFile: (file: File) => Promise<void>;
  receivedFile: Blob | null;
  receivedFileName: string | null;
  transferProgress: TransferProgress | null;
  error: string | null;
  clearReceivedFile: () => void;
  disconnect: () => void;
}

export function useP2P(): UseP2PResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [offerCode, setOfferCode] = useState<string | null>(null);
  const [answerCode, setAnswerCode] = useState<string | null>(null);
  const [transferProgress, setTransferProgress] = useState<TransferProgress | null>(null);
  const [receivedFile, setReceivedFile] = useState<Blob | null>(null);
  const [receivedFileName, setReceivedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<P2PConnection | null>(null);
  const startedRef = useRef(false);

  const events = useMemo<ConnectionEvents>(() => ({
    onStateChange: (state: ConnectionState) => {
      setConnectionState(state);
      if (state === 'DISCONNECTED') setTransferProgress(null);
    },
    onDataReceived: (data: Blob, fileName: string) => {
      setReceivedFile(data);
      setReceivedFileName(fileName);
    },
    onTransferProgress: (progress: TransferProgress) => {
      setTransferProgress(progress);
    },
    onError: (errorMsg: string) => {
      setError(errorMsg);
      setConnectionState('ERROR');
    },
  }), []);

  const startHost = useCallback(async () => {
    if (startedRef.current && connectionRef.current) {
      return { roomCode: roomCode || '', offerCode: offerCode || '' };
    }
    setError(null);
    setConnectionState('CONNECTING');
    setIsHost(true);
    setAnswerCode(null);
    startedRef.current = true;

    const connection = new P2PConnection(events);
    connectionRef.current = connection;

    const result = await connection.createOffer();
    setRoomCode(result.roomCode);
    setOfferCode(result.offerCode);

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinWithOfferCode = useCallback(async (offerCodeStr: string) => {
    if (startedRef.current && connectionRef.current) return;
    setError(null);
    setConnectionState('CONNECTING');
    setIsHost(false);
    setOfferCode(null);
    startedRef.current = true;

    const connection = new P2PConnection(events);
    connectionRef.current = connection;

    await connection.joinWithOfferCode(offerCodeStr);
    const answer = connection.getAnswerCode();
    setAnswerCode(answer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeConnection = useCallback(async (answerCodeStr: string) => {
    if (!connectionRef.current) throw new Error('No active connection');
    await connectionRef.current.completeWithAnswerCode(answerCodeStr);
  }, []);

  const sendFile = useCallback(async (file: File) => {
    if (!connectionRef.current) throw new Error('No active connection');
    setTransferProgress({
      bytesTransferred: 0,
      totalBytes: file.size,
      chunksTransferred: 0,
      totalChunks: Math.ceil(file.size / (1024 * 1024)),
      speed: 0,
    });
    await connectionRef.current.sendFile(file);
  }, []);

  const clearReceivedFile = useCallback(() => {
    setReceivedFile(null);
    setReceivedFileName(null);
  }, []);

  const disconnect = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    startedRef.current = false;
    setConnectionState('DISCONNECTED');
    setRoomCode(null);
    setIsHost(false);
    setOfferCode(null);
    setAnswerCode(null);
    setTransferProgress(null);
  }, []);

  // Auto-join from URL hash link
  useEffect(() => {
    const parsed = parseConnectionLink(window.location.href);
    if (parsed?.offerCode) {
      window.location.hash = '';
      joinWithOfferCode(parsed.offerCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      connectionRef.current?.close();
    };
  }, []);

  return {
    connectionState,
    roomCode,
    isHost,
    offerCode,
    answerCode,
    startHost,
    joinWithOfferCode,
    completeConnection,
    sendFile,
    receivedFile,
    receivedFileName,
    transferProgress,
    error,
    clearReceivedFile,
    disconnect,
  };
}
