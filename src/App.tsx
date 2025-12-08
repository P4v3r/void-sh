import React, { useState } from 'react';
import { Lock, Upload, CheckCircle2 } from 'lucide-react';

type Status = 'IDLE' | 'READY' | 'ENCRYPTING' | 'DONE';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('IDLE');
  const [copied, setCopied] = useState(false);
  const [isHover, setIsHover] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHover(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setStatus('READY');
    }
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('READY');
    }
  };

  const startEncrypt = () => {
    if (!file) return;
    setStatus('ENCRYPTING');
    // TODO: replace with real encryption logic
    setTimeout(() => setStatus('DONE'), 1500);
  };

  const copyLink = () => {
    navigator.clipboard.writeText('https://voidfiles.xyz/d/x91-safe#key_812739');
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const reset = () => {
    setFile(null);
    setStatus('IDLE');
    setCopied(false);
    setIsHover(false);
  };

  return (
    <div className="min-h-screen text-[15px] text-emerald-100 bg-[#050b10]">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col min-h-screen">
        {/* HEADER */}
        <header>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-block px-1.5 py-0.5 border border-emerald-700 text-[13px] tracking-[0.12em] uppercase">
                  void.sh
                </span>
                <span className="text-[12px] text-emerald-500 uppercase tracking-[0.2em]">
                  alpha
                </span>
              </div>
              {/* descrizione sintetica, senza slogan ridondanti */}
              <div className="space-y-0.5 mt-1">
                <p className="text-[13px] text-emerald-300/90">
                  Encrypt files in your browser and share them with a private link.
                </p>
                <p className="text-[13px] text-emerald-300/80">
                  No accounts, no tracking, no server-side decryption or key recovery.
                </p>
              </div>
            </div>
            <div className="text-right text-[12px] text-emerald-500 space-y-0.5">
              <p>CLIENT-SIDE ONLY</p>
              <p>NO ACCOUNTS · NO LOGS</p>
            </div>
          </div>
          <div className="hr-line mt-4" />
        </header>

        {/* CONTENUTO PRINCIPALE */}
        <main className="mt-5 mb-10 flex justify-start">
          <div className="w-full max-w-md mx-auto">
            {/* PANNELLO FILE */}
            <div className="panel rounded-md p-5">
              {/* riga di stato in alto nel pannello */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-emerald-300 font-mono">[ FILE_AREA ]</span>
                <span className="text-[12px] text-emerald-500 font-mono">
                  {status === 'IDLE' && 'STATE: IDLE'}
                  {status === 'READY' && 'STATE: READY'}
                  {status === 'ENCRYPTING' && 'STATE: WORKING'}
                  {status === 'DONE' && 'STATE: DONE'}
                </span>
              </div>

              {/* info tecniche, senza ripetere le frasi dell'header */}
              <p className="console-line text-emerald-300/90 mb-1 text-[13px]">
                &gt; encryption: AES-256-GCM · new random key per file
              </p>
              <p className="console-line text-emerald-300/85 mb-1 text-[13px]">
                &gt; processing: happens locally in your browser
              </p>
              <p className="console-line text-emerald-300/80 mb-2 text-[13px]">
                &gt; recovery: if you lose the key, we cannot restore the data
              </p>
              <div className="hr-line" />

              {/* DROP AREA */}
              {(status === 'IDLE' || status === 'READY') && (
                <div
                  className={
                    'relative mt-4 drop-area flex flex-col items-center justify-center px-4 py-7 cursor-pointer text-center transition-colors rounded-md border ' +
                    (isHover
                      ? 'drop-area-hover border-emerald-400 bg-emerald-500/5'
                      : 'border-emerald-800 bg-black/30 hover:border-emerald-400 hover:bg-emerald-500/5')
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsHover(true);
                  }}
                  onDragLeave={() => setIsHover(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="mb-3 text-emerald-300" size={28} />
                  {!file ? (
                    <>
                      <p className="text-[15px] font-semibold">
                        Drag a file into this box
                      </p>
                      <p className="text-emerald-300/75 text-[13px] mt-1">
                        or click inside this area to select a file from your device
                      </p>
                      {/* input solo nell’area file */}
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleBrowse}
                      />
                    </>
                  ) : (
                    <div className="max-w-full">
                      <div className="bg-black/40 border border-emerald-800 rounded-md px-3 py-2">
                        <p className="font-semibold text-[15px] truncate max-w-[260px] mx-auto">
                          {file.name}
                        </p>
                        <p className="text-[13px] text-emerald-300/80 mt-1">
                          {(file.size / 1024 / 1024).toFixed(2)} MB loaded
                        </p>
                      </div>
                      <p className="text-[12px] text-emerald-300/65 mt-2">
                        You can drop another file here to replace it, or use the buttons below.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AZIONI / STATI SOTTO LA DROP AREA */}
              {status === 'READY' && file && (
                <div className="mt-4 space-y-2">
                  <p className="text-[13px] text-emerald-200/90">
                    Choose what to do with this file:
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      className="btn inline-flex items-center gap-1 px-3 py-2 text-[13px] font-semibold bg-emerald-500 text-black hover:bg-emerald-400"
                      onClick={startEncrypt}
                    >
                      <Lock size={15} />
                      <span>Encrypt and create link</span>
                    </button>
                    <button
                      className="btn btn-ghost text-[13px] px-3 py-2"
                      onClick={reset}
                    >
                      Clear and choose another file
                    </button>
                  </div>
                </div>
              )}

              {status === 'ENCRYPTING' && (
                <div className="mt-6 flex items-center gap-3 text-emerald-200">
                  <Lock size={20} className="text-emerald-400 animate-pulse" />
                  <span className="text-[15px]">
                    Encrypting in your browser. Please wait…
                  </span>
                </div>
              )}

              {status === 'DONE' && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 size={18} />
                    <span className="text-[15px]">
                      Encryption complete. Your private link is ready.
                    </span>
                  </div>
                  <div className="text-[13px] text-emerald-200/90">
                    Anyone with this link can decrypt the file. We never see your key and
                    we do not keep an unencrypted copy of your data.
                  </div>

                  <div className="mt-2">
                    <p className="text-[13px] text-emerald-200/90 mb-1">
                      Copy or share this encrypted link:
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 border border-emerald-700/80 px-2 py-1.5 overflow-hidden bg-black/30 rounded">
                        <span className="text-[13px] truncate">
                          https://voidfiles.xyz/d/x91-safe#key_812739
                        </span>
                      </div>
                      <button
                        className="btn text-[13px] px-3 py-2 font-semibold bg-emerald-500 text-black hover:bg-emerald-400"
                        onClick={copyLink}
                      >
                        {copied ? 'Copied' : 'Copy link'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-[13px] text-emerald-200/90 mb-1">
                      When you are finished with this file:
                    </p>
                    <button
                      className="btn btn-ghost text-[13px] px-3 py-2"
                      onClick={reset}
                    >
                      Start again with a new file
                    </button>
                  </div>
                </div>
              )}

              {/* PICCOLA RIGA DI LOG IN FONDO */}
              <div className="mt-5 hr-line" />
              <div className="mt-2">
                {status === 'IDLE' && (
                  <p className="console-line text-emerald-400/75 text-[13px]">
                    &gt; waiting for file…
                  </p>
                )}
                {status === 'READY' && file && (
                  <p className="console-line text-emerald-400/75 text-[13px]">
                    &gt; file loaded · ready for encryption
                  </p>
                )}
                {status === 'ENCRYPTING' && (
                  <p className="console-line text-emerald-400/75 text-[13px]">
                    &gt; sealing payload…
                  </p>
                )}
                {status === 'DONE' && (
                  <p className="console-line text-emerald-400/75 text-[13px]">
                    &gt; encryption done · server never sees your key
                  </p>
                )}
              </div>
            </div>

            {/* NOTICE SOTTO AL PANNELLO */}
            <div className="mt-5 text-center text-[13px] text-emerald-300/80 leading-relaxed px-1">
              <p className="mb-1">
                Encryption happens entirely inside your browser. The server only receives
                encrypted data, never your key or plaintext file.
              </p>
              <p>
                If you lose the key or the link, the data cannot be recovered by us or by
                anyone else. This is by design: no recovery, no logs, no backdoors.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
