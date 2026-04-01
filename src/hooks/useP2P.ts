// src/hooks/useP2P.ts

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { P2PConnection, type ConnectionEvents } from '../p2p/connection';
import type { ConnectionState, TransferProgress } from '../p2p/types';

interface UseP2PResult {
  connectionState: ConnectionState;
  roomCode: string | null;
  isHost: boolean;
  offerCode: string | null;
  answerCode: string | null;
  startHost: () => Promise<{ roomCode: string; offerCode: string }>;
  joinWithOfferCode: (code: string) => Promise<string>;
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
  
  const eventsRef = useRef<ConnectionEvents>({
    onStateChange: () => {},
    onDataReceived: () => {},
    onTransferProgress: () => {},
    onError: () => {},
  });

  const events = useMemo(() => {
    const handlers = {
      onStateChange: (state: ConnectionState) => {
        setConnectionState(state);
        if (state === 'DISCONNECTED') {
          setTransferProgress(null);
        }
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
    };
    return handlers;
  }, []);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  
  const startHost = useCallback(async () => {
    setError(null);
    setConnectionState('CONNECTING');
    setIsHost(true);
    setAnswerCode(null);
    
    const connection = new P2PConnection(events);
    connectionRef.current = connection;
    
    const result = await connection.createOffer();
    setRoomCode(result.roomCode);
    setOfferCode(result.offerCode);
    
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const joinWithOfferCode = useCallback(async (offerCodeStr: string) => {
    setError(null);
    setConnectionState('CONNECTING');
    setIsHost(false);
    setOfferCode(null);
    
    const connection = new P2PConnection(events);
    connectionRef.current = connection;
    
    const answerRoomCode = await connection.joinWithOfferCode(offerCodeStr);
    setRoomCode(answerRoomCode);
    
    const answer = connection.getAnswerCode();
    setAnswerCode(answer);
    
    return answerRoomCode;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const completeConnection = useCallback(async (answerCodeStr: string) => {
    if (!connectionRef.current) {
      throw new Error('No active connection');
    }
    
    await connectionRef.current.completeWithAnswerCode(answerCodeStr);
  }, []);
  
  const sendFile = useCallback(async (file: File) => {
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
  
  const clearReceivedFile = useCallback(() => {
    setReceivedFile(null);
    setReceivedFileName(null);
  }, []);
  
  const disconnect = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    setConnectionState('DISCONNECTED');
    setRoomCode(null);
    setIsHost(false);
    setOfferCode(null);
    setAnswerCode(null);
    setTransferProgress(null);
  }, []);
  
  useEffect(() => {
    const pendingOffer = sessionStorage.getItem('pendingP2POffer');
    if (pendingOffer) {
      sessionStorage.removeItem('pendingP2POffer');
      const connection = new P2PConnection(events);
      connectionRef.current = connection;
      setIsHost(false);
      connection.joinWithOfferCode(pendingOffer).then((answerRoomCode) => {
        setRoomCode(answerRoomCode);
        setAnswerCode(connection.getAnswerCode());
      }).catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to join');
      });
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
