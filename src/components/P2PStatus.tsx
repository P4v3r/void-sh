// src/components/P2PStatus.tsx


import { Wifi, WifiOff, Loader2, X } from 'lucide-react';
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
    <div className="fixed top-4 right-4 z-50 bg-black/90 border border-emerald-800 rounded-lg p-3 shadow-xl max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isConnecting && <Loader2 className="animate-spin text-emerald-400" size={16} />}
          {isConnected && <Wifi className="text-emerald-400" size={16} />}
          {!isConnected && !isConnecting && <WifiOff className="text-red-400" size={16} />}
          
          <span className="text-emerald-100 text-sm font-medium">
            {isConnecting ? 'Connecting...' : isConnected ? 'P2P Connected' : 'Disconnected'}
          </span>
        </div>
        
        <button
          onClick={onDisconnect}
          className="p-1 text-emerald-500/50 hover:text-red-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      
      {progress && progress.totalBytes > 0 && (
        <div className="space-y-2">
          <div className="w-full h-2 bg-emerald-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(progress.bytesTransferred / progress.totalBytes) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-emerald-500/60">
            <span>{(progress.bytesTransferred / 1024 / 1024).toFixed(1)} / {(progress.totalBytes / 1024 / 1024).toFixed(1)} MB</span>
            <span>{(progress.speed / 1024 / 1024).toFixed(1)} MB/s</span>
          </div>
        </div>
      )}
    </div>
  );
}
