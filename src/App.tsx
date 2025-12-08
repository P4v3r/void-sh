import React, { useState } from 'react';
import { Shield, Upload, Lock, Eye, Terminal, FileCheck, Skull } from 'lucide-react';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'ENCRYPTING' | 'DONE'>('IDLE');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // TODO: later you will replace this with real client-side encryption logic
  const startEncryption = () => {
    if (!file) return;
    setStatus('ENCRYPTING');
    setTimeout(() => {
      setStatus('DONE');
    }, 2000);
  };

  const resetAll = () => {
    setFile(null);
    setStatus('IDLE');
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 flex flex-col selection:bg-emerald-900/60 selection:text-white">
      {/* Header styled like a modern Linux desktop app */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Terminal size={28} className="text-emerald-400" />
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-glow">
              Void.sh
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            secure file operations · client-side encryption · zero-knowledge
          </p>
        </div>
        <div className="text-xs text-right text-slate-500 space-y-0.5">
          <p>SESSION: #root@void-shell</p>
          <p>BACKEND: static (no logs)</p>
          <p>MODE: private · onion-ready</p>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        <div className="w-full cyber-border p-4 md:p-6 lg:p-8">
          
          {/* Window chrome like GNOME/Konsole */}
          <div className="window-chrome">
            <div className="flex items-center gap-2">
              <div className="window-dots">
                <span className="window-dot red" />
                <span className="window-dot yellow" />
                <span className="window-dot green" />
              </div>
              <span className="text-xs text-slate-400 font-mono">
                /usr/bin/void.sh · bunker-mode
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {status === 'IDLE' && 'ready'}
              {status === 'ENCRYPTING' && 'encrypting…'}
              {status === 'DONE' && 'done'}
            </span>
          </div>

          {/* Fake prompt line */}
          <div className="mb-5 text-xs md:text-sm font-mono text-slate-300">
            <p>
              <span className="text-emerald-400">void@bunker</span>
              <span className="text-slate-500">:~$</span> initialize secure transfer
              <span className="cursor-blink" />
            </p>
          </div>

          {/* Technical status tags */}
          <div className="flex flex-wrap gap-4 mb-6 text-[11px] md:text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/60 border border-slate-800">
              <Shield size={13} className="text-emerald-400" /> crypto-suite: AES-256-GCM
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/60 border border-slate-800">
              <Eye size={13} className="text-sky-400" /> scope: browser-only (no upload)
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/60 border border-slate-800">
              <Skull size={13} className="text-rose-400" /> policy: zero recovery · zero trust
            </span>
          </div>

          {/* Main interaction area */}
          {status === 'IDLE' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={[
                'border-2 rounded-lg transition-all duration-200 h-64',
                'flex flex-col items-center justify-center cursor-pointer group relative',
                isDragOver
                  ? 'border-emerald-400 bg-emerald-500/5'
                  : 'border-dashed border-slate-700 hover:border-emerald-500 hover:bg-slate-800/40'
              ].join(' ')}
            >
              {!file ? (
                <>
                  <Upload
                    size={42}
                    className="mb-4 text-slate-500 group-hover:text-emerald-400 transition-colors"
                  />
                  <p className="text-base md:text-lg font-semibold text-slate-100">
                    Drag a file here to secure it
                  </p>
                  <p className="text-[11px] md:text-xs text-slate-400 mt-1">
                    or click to choose it from your filesystem
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileInput}
                    id="fileInput"
                  />
                  <label
                    htmlFor="fileInput"
                    className="absolute inset-0 cursor-pointer"
                  ></label>
                </>
              ) : (
                <div className="text-center px-4">
                  <FileCheck size={40} className="mx-auto mb-3 text-emerald-400" />
                  <p className="text-lg font-semibold text-slate-100 truncate max-w-xs mx-auto">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(file.size / 1024).toFixed(2)} KB detected · ready for encryption
                  </p>
                  <button
                    onClick={startEncryption}
                    className="mt-5 inline-flex items-center justify-center bg-emerald-500 text-slate-900 font-semibold px-6 py-2 rounded-md hover:bg-emerald-400 transition-colors text-xs md:text-sm tracking-wide"
                  >
                    Start secure encryption
                  </button>
                </div>
              )}
            </div>
          )}

          {status === 'ENCRYPTING' && (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
              <Lock size={42} className="text-emerald-400 animate-pulse" />
              <p className="text-lg font-semibold text-slate-100">
                Encrypting…
              </p>
              <div className="w-full max-w-md h-2 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-pulse" style={{ width: '70%' }} />
              </div>
              <div className="text-[11px] md:text-xs font-mono text-slate-400 text-left max-w-md mx-auto">
                <p>&gt; deriving_keys  · OK</p>
                <p>&gt; sealing_payload · OK</p>
                <p>&gt; scrubbing_metadata · ACTIVE</p>
              </div>
            </div>
          )}

          {status === 'DONE' && (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-full max-w-xl border border-slate-700 rounded-md bg-slate-900/70 p-3 text-left">
                <p className="text-[11px] text-slate-500 mb-1 font-mono">
                  generated link (example · will be real later):
                </p>
                <code className="block text-xs md:text-sm bg-slate-950/80 px-3 py-2 rounded text-emerald-300 break-all">
                  https://void.sh/d/7x91_safe#key_812739
                </code>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setStatus('IDLE')} // TODO: later you will add real clipboard copy
                  className="inline-flex items-center justify-center bg-emerald-500 text-slate-900 font-semibold px-5 py-2 rounded-md hover:bg-emerald-400 transition-colors text-xs md:text-sm"
                >
                  Copy link
                </button>
                <button
                  onClick={resetAll}
                  className="inline-flex items-center justify-center border border-slate-600 text-slate-200 px-5 py-2 rounded-md hover:border-emerald-400 hover:text-emerald-200 transition-colors text-xs md:text-sm"
                >
                  New operation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security notice footer */}
        <div className="mt-6 text-center max-w-xl text-[11px] md:text-xs text-slate-500 font-mono">
          <p className="mb-1">
            Notice: encryption will happen locally in your browser. No keys or plaintext
            files are sent to remote servers.
          </p>
          <p>
            If you lose the key or the link, the data is unrecoverable for anyone. This is
            by design · zero recovery, zero log.
          </p>
        </div>
      </main>

      {/* Small “terminal status” details */}
      <div className="fixed bottom-4 left-4 text-[10px] text-slate-600 font-mono hidden md:block">
        TTY1 · MEM 64MB OK · CPU 7% · KERNEL 6.6
      </div>
      <div className="fixed bottom-4 right-4 text-[10px] text-slate-600 font-mono hidden md:block">
        DISPLAY :0 · WM: tiling · THEME: dark
      </div>
    </div>
  );
}

export default App;
