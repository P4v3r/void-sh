import React, { useState } from 'react';
import { ShieldCheck, Upload, Lock, CheckCircle2, FileText, Link2 } from 'lucide-react';

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

  const startEncryption = () => {
    if (!file) return;
    setStatus('ENCRYPTING');
    setTimeout(() => {
      setStatus('DONE');
    }, 1600);
  };

  const resetAll = () => {
    setFile(null);
    setStatus('IDLE');
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-6 md:py-10 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center">
              <ShieldCheck className="text-emerald-400" size={22} />
            </div>
            <div>
              <div className="logo-mark">VOID.SH</div>
              <div className="logo-title">File bunker per maniaci della privacy</div>
              <p className="logo-subtitle">
                Cifra, nascondi e condividi file in modo sicuro. Tutto avviene sul tuo dispositivo.
              </p>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end text-xs text-slate-400">
            <span>Client-side only • Zero log</span>
            <span className="text-emerald-400">Connessione sicura attiva</span>
          </div>
        </header>

        <div className="glass-panel neon-frame p-5 md:p-7">

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
              <Lock size={14} />
              AES-256 • Client-side
            </span>
            <span>Chiavi non salvate • Nessun tracciamento</span>
          </div>

          {status === 'IDLE' && (
            <div className="grid gap-6 md:grid-cols-[minmax(0,2fr),minmax(0,1fr)] items-start">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`dropzone relative flex flex-col items-center justify-center px-4 py-10 cursor-pointer ${
                  isDragOver ? 'dropzone-hover' : ''
                }`}
              >
                {!file ? (
                  <>
                    <Upload size={40} className="mb-3 text-slate-300" />
                    <p className="text-base font-semibold">Trascina qui un file da proteggere</p>
                    <p className="text-xs text-slate-400 mt-1">
                      oppure clicca per selezionarlo dal dispositivo
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      id="fileInput"
                      onChange={(e) => e.target.files && setFile(e.target.files[0])}
                    />
                    <label htmlFor="fileInput" className="absolute inset-0" />
                  </>
                ) : (
                  <div className="text-center px-4">
                    <FileText size={36} className="mx-auto mb-3 text-emerald-300" />
                    <p className="font-semibold break-all">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(file.size / 1024).toFixed(1)} KB selezionati
                    </p>
                    <button
                      onClick={startEncryption}
                      className="btn-primary mt-5"
                    >
                      Proteggi il file
                    </button>
                  </div>
                )}
              </div>

              <aside className="space-y-3 text-sm text-slate-300">
                <p className="font-medium">Come funziona</p>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>• Il file viene cifrato direttamente nel tuo browser.</li>
                  <li>• La chiave di cifratura non lascia mai il tuo dispositivo.</li>
                  <li>• Puoi condividere un link con chiave incorporata (stile “secure link”).</li>
                  <li>• In futuro qui compariranno modalità “steganografia” ed “eredità digitale”.</li>
                </ul>
                <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-700/60 pt-3">
                  Nota: se perdi la chiave o il link generato, nessuno (nemmeno noi) potrà
                  recuperare il contenuto.
                </div>
              </aside>
            </div>
          )}

          {status === 'ENCRYPTING' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <Lock size={40} className="text-emerald-300 animate-pulse" />
              <p className="text-base font-semibold">Cifratura in corso…</p>
              <p className="text-xs text-slate-400">
                Stiamo preparando un pacchetto sicuro che solo chi possiede la chiave potrà aprire.
              </p>
              <div className="w-full max-w-md mt-4">
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-emerald-400 to-sky-400 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {status === 'DONE' && (
            <div className="flex flex-col items-center justify-center py-10 gap-5 text-center">
              <CheckCircle2 size={40} className="text-emerald-400" />
              <div>
                <p className="text-base font-semibold mb-1">File protetto con successo</p>
                <p className="text-xs text-slate-400">
                  Condividi questo link solo con chi deve avere accesso al contenuto.
                </p>
              </div>
              <div className="w-full max-w-xl text-left text-xs">
                <p className="mb-1 text-slate-400 flex items-center gap-1">
                  <Link2 size={14} /> Link sicuro (esempio)
                </p>
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 font-mono text-[11px] break-all text-slate-200">
                  https://void.sh/d/7x91_safe#key_812739
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button className="btn-primary">
                  Copia link
                </button>
                <button className="btn-ghost" onClick={resetAll}>
                  Nuovo file
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] text-slate-500 text-center max-w-2xl mx-auto">
          Void.sh nasce con un approccio “privacy-first”: nessun tracciamento, nessun account obbligatorio,
          nessuna analisi dei contenuti. L’obiettivo è diventare il posto sicuro dove i tuoi file
          sensibili non lasciano mai davvero il tuo controllo.
        </p>
      </div>
    </div>
  );
}

export default App;