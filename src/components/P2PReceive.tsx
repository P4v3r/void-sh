// src/components/P2PReceive.tsx

import { Link2, CheckCircle2, Loader2 } from 'lucide-react';

interface P2PReceiveProps {
  onReceive: (roomCode: string) => void;
  isConnected: boolean;
  isConnecting: boolean;
}

export function P2PReceive({
  isConnected,
  isConnecting,
}: P2PReceiveProps) {
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

  return (
    <div className="text-center py-4">
      <Link2 className="mx-auto mb-2 text-emerald-400" size={24} />
      <p className="text-emerald-300 font-bold">Waiting for sender...</p>
      <p className="text-emerald-500/60 text-sm">Open the sender's link to connect</p>
    </div>
  );
}
