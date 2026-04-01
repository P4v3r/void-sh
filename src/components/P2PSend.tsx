// src/components/P2PSend.tsx

import React, { useState } from 'react';
import { Link2, Copy, CheckCircle2, Wifi, Loader2 } from 'lucide-react';

interface P2PSendProps {
  onSend: (file: File) => void;
  isConnected: boolean;
  connectionInfo: { roomCode: string; offerCode: string } | null;
  isConnecting: boolean;
  onStartHost: () => Promise<{ roomCode: string; offerCode: string }>;
  onCompleteConnection: (answerCode: string) => Promise<void>;
}

export function P2PSend({
  onSend,
  isConnected,
  connectionInfo,
  isConnecting,
  onStartHost,
  onCompleteConnection,
}: P2PSendProps) {
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [answerCode, setAnswerCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGenerateLink = async () => {
    try {
      setError(null);
      await onStartHost();
      setShowCode(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create connection');
    }
  };
  
  const handleCopyLink = () => {
    if (!connectionInfo) return;
    
    const link = `${window.location.origin}/connect/${connectionInfo.roomCode}?offer=${encodeURIComponent(connectionInfo.offerCode)}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleCopyCode = () => {
    if (!connectionInfo) return;
    navigator.clipboard.writeText(connectionInfo.offerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handlePasteAnswer = async () => {
    try {
      setError(null);
      await onCompleteConnection(answerCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid answer code');
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };
  
  const handleSend = () => {
    if (file) onSend(file);
  };
  
  // Not connected - show generate button
  if (!isConnected && !showCode) {
    return (
      <div className="p-4">
        <button
          onClick={handleGenerateLink}
          disabled={isConnecting}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 text-white font-bold rounded flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Creating Connection...
            </>
          ) : (
            <>
              <Link2 size={18} />
              Generate P2P Connection Link
            </>
          )}
        </button>
        
        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>
    );
  }
  
  // Connected - show answer code input (waiting for receiver)
  if (!isConnected && showCode && connectionInfo) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center">
          <Wifi className="mx-auto mb-2 text-emerald-400" size={24} />
          <p className="text-emerald-300 font-bold">Share Link with Receiver</p>
          <p className="text-emerald-500/60 text-sm">Or share code manually below</p>
        </div>
        
        <div className="bg-black/30 border border-emerald-800 rounded p-3">
          <p className="text-xs text-emerald-500/60 mb-1">Connection Link</p>
          <div className="flex gap-2">
            <code className="flex-1 text-emerald-300 text-xs truncate">
              {window.location.origin}/connect/{connectionInfo.roomCode}
            </code>
            <button
              onClick={handleCopyLink}
              className="p-1 text-emerald-400 hover:text-emerald-300"
            >
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        
        <div className="text-center text-emerald-500/50 text-sm">OR</div>
        
        <div>
          <p className="text-xs text-emerald-500/60 mb-1">Manual Code (for receiver)</p>
          <div className="bg-black/30 border border-emerald-800 rounded p-2">
            <code className="text-emerald-300 text-xs break-all">
              {connectionInfo.offerCode.slice(0, 50)}...
            </code>
          </div>
          <button
            onClick={handleCopyCode}
            className="mt-2 w-full text-xs text-emerald-500/70 hover:text-emerald-400"
          >
            Copy Full Code
          </button>
        </div>
        
        <div className="border-t border-emerald-900/30 pt-4">
          <p className="text-xs text-emerald-500/60 mb-2">Waiting for receiver to connect...</p>
          <p className="text-xs text-emerald-500/40">
            Once connected, paste their answer code here:
          </p>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={answerCode}
              onChange={(e) => setAnswerCode(e.target.value)}
              placeholder="Paste answer code..."
              className="flex-1 bg-black/30 border border-emerald-800 rounded px-3 py-2 text-sm text-emerald-100"
            />
            <button
              onClick={handlePasteAnswer}
              disabled={!answerCode}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 text-white rounded text-sm"
            >
              Connect
            </button>
          </div>
        </div>
        
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
      </div>
    );
  }
  
  // Connected - show file selection
  if (isConnected) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24} />
          <p className="text-emerald-300 font-bold">Connected!</p>
          <p className="text-emerald-500/60 text-sm">Select a file to send</p>
        </div>
        
        <div className="relative">
          <input
            type="file"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="border-2 border-dashed border-emerald-800 rounded-lg p-6 text-center hover:border-emerald-600 transition-colors">
            {file ? (
              <div>
                <p className="text-emerald-100 font-medium">{file.name}</p>
                <p className="text-emerald-500/60 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <p className="text-emerald-500/60">Click to select file</p>
            )}
          </div>
        </div>
        
        <button
          onClick={handleSend}
          disabled={!file}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 disabled:text-emerald-500/30 text-white font-bold rounded flex items-center justify-center gap-2"
        >
          <Link2 size={18} />
          Send Encrypted File
        </button>
      </div>
    );
  }
  
  return null;
}
