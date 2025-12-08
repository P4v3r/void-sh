import React, { useState } from 'react';
import { ShieldCheck, UploadCloud, Lock, ArrowRight, Zap, Copy, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'ENCRYPTING' | 'DONE'>('IDLE');
  const [copied, setCopied] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const startProcess = () => {
    if (!file) return;
    setStatus('ENCRYPTING');
    setTimeout(() => setStatus('DONE'), 2500); // Simulazione più lunga per l'effetto
  };

  const copyLink = () => {
    navigator.clipboard.writeText("https://void.sh/d/x91_safe#key_812");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col relative text-white antialiased selection:bg-indigo-500/30">
      <div className="aurora-bg" />

      <nav className="w-full max-w-6xl mx-auto p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 font-semibold tracking-tight text-xl">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Lock size={16} className="text-white" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Void.sh
          </span>
        </div>
        <div className="hidden md:flex gap-6 text-sm text-white/50 font-medium">
          <span className="hover:text-white transition-colors cursor-pointer">Manifesto</span>
          <span className="hover:text-white transition-colors cursor-pointer">Security</span>
          <span className="hover:text-white transition-colors cursor-pointer">GitHub</span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 max-w-2xl"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40">
            Invisible Storage.
          </h1>
          <p className="text-lg text-white/40 font-light">
            Client-side encryption. Zero knowledge. <br className="hidden md:block"/>
            The file never leaves your device unencrypted.
          </p>
        </motion.div>

        <motion.div 
          layout
          className="w-full max-w-md glass-panel rounded-3xl p-1 overflow-hidden relative group"
        >

          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-500 blur-lg" />
          
          <div className="relative bg-[#0a0a0a]/80 rounded-[22px] p-8 h-[400px] flex flex-col items-center justify-center">
            
            <AnimatePresence mode="wait">
              {status === 'IDLE' && (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full h-full flex flex-col items-center justify-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  {!file ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/10">
                        <UploadCloud size={32} className="text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                      </div>
                      <p className="text-lg font-medium text-white/80">Drop your file here</p>
                      <p className="text-sm text-white/30 mt-2 mb-8">Up to 100MB • End-to-End Encrypted</p>
                      
                      <label className="btn-primary px-8 py-3 rounded-xl font-medium text-sm cursor-pointer flex items-center gap-2">
                        Browse Files <ArrowRight size={14} />
                        <input type="file" className="hidden" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                      </label>
                    </>
                  ) : (
                    <div className="w-full text-center">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4 border border-indigo-500/30 text-indigo-300">
                        <Zap size={28} fill="currentColor" />
                      </div>
                      <h3 className="text-xl font-semibold mb-1 truncate px-4">{file.name}</h3>
                      <p className="text-sm text-white/40 mb-8">{(file.size / 1024 / 1024).toFixed(2)} MB ready to lock</p>
                      
                      <button onClick={startProcess} className="w-full btn-primary py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                        <Lock size={16} /> Encrypt & Upload
                      </button>
                      <button onClick={() => setFile(null)} className="mt-4 text-xs text-white/30 hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {status === 'ENCRYPTING' && (
                <motion.div 
                  key="encrypting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative w-24 h-24 mb-6">
                    <svg className="animate-spin duration-[3s] w-full h-full text-indigo-500/20" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock size={24} className="text-indigo-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-medium animate-pulse">Encrypting...</h3>
                  <p className="text-sm text-white/30 mt-2">Deriving keys with Argon2id</p>
                </motion.div>
              )}

              {status === 'DONE' && (
                <motion.div 
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full px-4 text-center"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6 text-green-400 border border-green-500/30 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Secure Link Ready</h3>
                  <p className="text-white/40 text-sm mb-6">This link contains the decryption key. Don't lose it.</p>
                  
                  <div className="bg-white/5 border border-white/10 rounded-xl p-1 pl-4 flex items-center gap-2 mb-6 group-focus-within:border-indigo-500/50 transition-colors">
                    <span className="text-white/40 text-sm truncate flex-1 font-mono text-left">void.sh/d/x91...#key_812</span>
                    <button 
                      onClick={copyLink}
                      className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg text-white transition-all active:scale-95"
                    >
                      {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>

                  <button 
                    onClick={() => { setStatus('IDLE'); setFile(null); }}
                    className="text-sm text-white/30 hover:text-white transition-colors"
                  >
                    Send another file
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </motion.div>

        <div className="mt-12 flex gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck size={14} /> AES-256-GCM
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Zap size={14} /> WebAssembly
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;