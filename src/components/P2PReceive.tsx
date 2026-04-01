// src/components/P2PReceive.tsx

import { useState } from 'react';
import { Link2, AlertTriangle, CheckCircle2, Loader2, Copy } from 'lucide-react';

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
      setError('Invalid code format');
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
      <div className="p-4 text-center">
        <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24} />
        <p className="text-emerald-300 font-bold">Connected!</p>
        <p className="text-emerald-500/60 text-sm">Waiting for file...</p>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="p-4 text-center space-y-3">
        <Loader2 className="mx-auto animate-spin text-emerald-400" size={24} />
        <p className="text-emerald-300 font-bold">Connecting...</p>
        <p className="text-emerald-500/60 text-sm">Establishing P2P link</p>
      </div>
    );
  }

  if (answerCode) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24} />
          <p className="text-emerald-300 font-bold">Answer Generated!</p>
          <p className="text-emerald-500/60 text-sm">Send this code back to the sender</p>
        </div>

        <div className="bg-black/30 border border-emerald-800 rounded p-3">
          <p className="text-xs text-emerald-500/60 mb-1">Answer Code:</p>
          <code className="text-emerald-300 text-xs break-all">{answerCode}</code>
        </div>

        <button
          onClick={handleCopyAnswer}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-2 text-sm"
        >
          {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Answer Code'}
        </button>

        <p className="text-xs text-emerald-500/40 text-center">
          Once the sender pastes this code, the file will be sent automatically
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <Link2 className="mx-auto mb-2 text-emerald-400" size={24} />
        <p className="text-emerald-300 font-bold">Join P2P Connection</p>
        <p className="text-emerald-500/60 text-sm">Enter the offer code from sender</p>
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
          onChange={(e) => setOfferCode(e.target.value)}
          placeholder="Paste offer code here (void:...)"
          className="w-full h-24 bg-black/30 border border-emerald-800 rounded px-3 py-2 text-sm text-emerald-100 resize-none"
        />
      </div>

      <button
        onClick={handleConnect}
        disabled={!offerCode.trim()}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 disabled:text-emerald-500/30 text-white font-bold rounded flex items-center justify-center gap-2"
      >
        <Link2 size={18} />
        Connect & Generate Answer
      </button>
    </div>
  );
}
