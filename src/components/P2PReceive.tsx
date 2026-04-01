// src/components/P2PReceive.tsx

import { useState } from 'react';
import { Link2, AlertTriangle, CheckCircle2, Loader2, Copy, ArrowDown } from 'lucide-react';

interface P2PReceiveProps {
  onReceive: (offerCode: string) => void;
  isConnected: boolean;
  isConnecting: boolean;
  answerCode: string | null;
}

export function P2PReceive({
  onReceive,
  isConnected,
  isConnecting,
  answerCode,
}: P2PReceiveProps) {
  const [offerCode, setOfferCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConnect = () => {
    if (!offerCode.trim()) {
      setError('Please enter the offer code');
      return;
    }
    if (!offerCode.startsWith('void:')) {
      setError('Invalid code format. Must start with "void:"');
      return;
    }
    setError(null);
    onReceive(offerCode);
  };

  const handleCopyAnswer = () => {
    if (!answerCode) return;
    navigator.clipboard.writeText(answerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isConnected) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24} />
        <p className="text-emerald-300 font-bold">Connected!</p>
        <p className="text-emerald-500/60 text-sm">Waiting for file...</p>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="text-center py-4 space-y-3">
        <Loader2 className="mx-auto animate-spin text-emerald-400" size={24} />
        <p className="text-emerald-300 font-bold">Connecting...</p>
        <p className="text-emerald-500/60 text-sm">Establishing P2P link</p>
      </div>
    );
  }

  if (answerCode) {
    return (
      <div className="space-y-3">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24} />
          <p className="text-emerald-300 font-bold">Answer Generated!</p>
          <p className="text-emerald-500/60 text-sm">Send this back to the sender</p>
        </div>

        <div className="bg-black/30 border border-emerald-800 rounded p-3">
          <p className="text-[10px] text-emerald-500/60 mb-1">Answer Code:</p>
          <code className="text-emerald-300 text-[10px] break-all leading-tight">{answerCode}</code>
        </div>

        <button
          onClick={handleCopyAnswer}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-2 text-sm"
        >
          {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Answer Code'}
        </button>

        <div className="flex items-center gap-2 text-emerald-500/40 text-xs">
          <div className="flex-1 h-px bg-emerald-800" />
          Sender will connect, then file arrives automatically
          <div className="flex-1 h-px bg-emerald-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Link2 className="mx-auto mb-2 text-emerald-400" size={24} />
        <p className="text-emerald-300 font-bold">Receive File</p>
        <p className="text-emerald-500/60 text-sm">Paste the sender's offer code</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div>
        <textarea
          value={offerCode}
          onChange={(e) => {
            setOfferCode(e.target.value);
            setError(null);
          }}
          placeholder="Paste offer code here (starts with void:)"
          className="w-full h-20 bg-black/30 border border-emerald-800 rounded px-3 py-2 text-xs text-emerald-100 resize-none font-mono"
        />
      </div>

      <button
        onClick={handleConnect}
        disabled={!offerCode.trim()}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 disabled:text-emerald-500/30 text-white font-bold rounded flex items-center justify-center gap-2"
      >
        <ArrowDown size={18} />
        Connect & Receive
      </button>
    </div>
  );
}
