import React, { useState } from 'react';
import { Shield, Upload, Lock, Eye, Terminal, FileCheck, Skull } from 'lucide-react';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'ENCRYPTING' | 'DONE'>('IDLE');

  // Gestione Drag & Drop
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

  // Simulazione Crittografia (Qui metterai la logica vera poi)
  const startEncryption = () => {
    if (!file) return;
    setStatus('ENCRYPTING');
    setTimeout(() => {
      setStatus('DONE'); // Simula 2 secondi di lavoro
    }, 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col relative selection:bg-green-900 selection:text-white">
      {/* Overlay Scanlines CRT */}
      <div className="scanlines pointer-events-none" />

      {/* Header stile 'Boot Sequence' */}
      <header className="flex justify-between items-end border-b border-emerald-900/50 pb-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-glow flex items-center gap-2">
            <Terminal size={32} /> VOID.SH
          </h1>
          <p className="text-xs text-emerald-700 mt-1">
            Build: v0.9.1-alpha // SECURE_CONN: ESTABLISHED // ONION_ROUTING: READY
          </p>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-xs text-emerald-600 animate-pulse">SYSTEM STATUS: NORMAL</p>
           <p className="text-xs text-emerald-800">NO LOGS DETECTED</p>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
        
        {/* Terminal Window Decor */}
        <div className="w-full bg-black/50 backdrop-blur-sm cyber-border p-6 md:p-10 transition-all duration-300">
          
          {/* Status Bar finta */}
          <div className="flex gap-4 mb-6 text-sm text-emerald-600 font-bold">
            <span className="flex items-center gap-1"><Shield size={14}/> AES-256-GCM</span>
            <span className="flex items-center gap-1"><Eye size={14} className="text-red-900"/> CLIENT-SIDE ONLY</span>
            <span className="flex items-center gap-1"><Skull size={14}/> ZERO KNOWLEDGE</span>
          </div>

          {/* Core Interaction Area */}
          {status === 'IDLE' && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-none transition-all duration-300 h-64 flex flex-col items-center justify-center cursor-pointer group
                ${isDragOver ? 'border-emerald-400 bg-emerald-900/20' : 'border-emerald-800 hover:border-emerald-600 hover:bg-emerald-900/5'}
              `}
            >
              {!file ? (
                <>
                  <Upload size={48} className="mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <p className="text-lg font-bold text-glow">DRAG_OBJECT_HERE</p>
                  <p className="text-xs text-emerald-700 mt-2">[ OR CLICK TO BROWSE ]</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => e.target.files && setFile(e.target.files[0])} 
                    id="fileInput"
                  />
                  <label htmlFor="fileInput" className="absolute inset-0 cursor-pointer"></label>
                </>
              ) : (
                <div className="text-center">
                  <FileCheck size={48} className="mx-auto mb-4 text-emerald-400" />
                  <p className="text-xl font-bold">{file.name}</p>
                  <p className="text-sm text-emerald-700 mt-1">{(file.size / 1024).toFixed(2)} KB DETECTED</p>
                  <button 
                    onClick={startEncryption}
                    className="mt-6 bg-emerald-600 text-black font-bold px-8 py-2 hover:bg-emerald-400 transition-colors uppercase tracking-widest text-sm"
                  >
                    Initialize Encryption
                  </button>
                </div>
              )}
            </div>
          )}

          {status === 'ENCRYPTING' && (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <Lock size={48} className="animate-pulse mb-4" />
              <p className="text-xl font-bold text-glow">ENCRYPTING BITS...</p>
              <div className="w-64 h-2 bg-emerald-900 mt-4 rounded-none overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[width_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
              </div>
              <p className="text-xs text-emerald-700 mt-2 font-mono">
                &gt; GENERATING_KEYS... OK<br/>
                &gt; SHUFFLING_IV... OK<br/>
                &gt; OBFUSCATING_METADATA... PROCESS
              </p>
            </div>
          )}

          {status === 'DONE' && (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="border border-emerald-500 p-4 mb-4 bg-emerald-900/10 w-full">
                <p className="text-xs text-emerald-600 mb-1">DOWNLOAD_LINK_GENERATED</p>
                <code className="block bg-black p-2 text-emerald-300 text-sm break-all">
                  https://void.sh/d/7x91_safe#key_812739
                </code>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setStatus('IDLE')}
                  className="bg-emerald-600 text-black font-bold px-6 py-2 hover:bg-emerald-400 text-sm uppercase"
                >
                  Copy Link
                </button>
                <button 
                  onClick={() => {setFile(null); setStatus('IDLE')}}
                  className="border border-emerald-700 text-emerald-500 px-6 py-2 hover:border-emerald-500 text-sm uppercase"
                >
                  New Operation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Warning */}
        <div className="mt-8 text-center opacity-50 max-w-xl">
           <p className="text-[10px] uppercase tracking-widest">
             Warning: Data is encrypted locally. If you lose the link, the data is lost forever. 
             We cannot recover it. We do not know who you are.
           </p>
        </div>

      </main>
      
      {/* Decorative Corner Text */}
      <div className="fixed bottom-4 left-4 text-[10px] text-emerald-800 hidden md:block">
        MEM: 64MB OK<br/>CPU: 12% USAGE
      </div>
    </div>
  );
}

export default App;