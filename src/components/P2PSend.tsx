// src/components/P2PSend.tsx

import React, { useState } from 'react';
import { Link2, Copy, CheckCircle2, Wifi, Loader2 } from 'lucide-react';
import { generateConnectionLink } from '../p2p/signaling';

interface P2PSendProps {
  onSend: (file: File) => void;
  isConnected: boolean;
  roomCode: string | null;
  isConnecting: boolean;
  onStartHost: () => Promise<{ roomCode: string }>;
}

export function P2PSend({
  onSend,
  isConnected,
  roomCode,
  isConnecting,
  onStartHost,
}: P2PSendProps) {
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    try {
      setError(null);
      await onStartHost();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create connection');
    }
  };

  const handleCopyLink = () => {
    if (!roomCode) return;
    const link = generateConnectionLink(roomCode);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isConnected) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24} />
          <p className="text-emerald-300 font-bold">Connected!</p>
          <p className="text-emerald-500/60 text-sm">Select a file to send</p>
        </div>

        <div className="relative">
          <input
            type="file"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="border-2 border-dashed border-emerald-800 rounded-lg p-6 text-center hover:border-emerald-600 transition-colors">
            {file ? (
              <>
                <p className="text-emerald-100 font-medium">{file.name}</p>
                <p className="text-emerald-500/60 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </>
            ) : (
              <p className="text-emerald-500/60">Click to select file</p>
            )}
          </div>
        </div>

        <button
          onClick={() => file && onSend(file)}
          disabled={!file}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 disabled:text-emerald-500/30 text-white font-bold rounded flex items-center justify-center gap-2"
        >
          <Link2 size={18} />
          Send Encrypted File
        </button>
      </div>
    );
  }

  if (isConnecting || roomCode) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <Wifi className="mx-auto mb-2 text-emerald-400" size={24} />
          <p className="text-emerald-300 font-bold">Share Link with Receiver</p>
          <p className="text-emerald-500/60 text-sm">They open it and connect automatically</p>
        </div>

        {roomCode && (
          <div className="bg-black/30 border border-emerald-800 rounded p-3">
            <p className="text-xs text-emerald-500/60 mb-1">Connection Link</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-emerald-300 text-xs truncate">
                {generateConnectionLink(roomCode)}
              </code>
              <button onClick={handleCopyLink} className="p-1 text-emerald-400 hover:text-emerald-300 shrink-0">
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {isConnecting && !roomCode && (
          <div className="text-center py-4">
            <Loader2 className="mx-auto animate-spin text-emerald-400 mb-2" size={24} />
            <p className="text-emerald-300 text-sm">Creating connection...</p>
          </div>
        )}

        <div className="text-center text-emerald-500/40 text-xs">
          Waiting for receiver to join...
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleStart}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-2"
      >
        <Link2 size={18} />
        Generate Connection Link
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
