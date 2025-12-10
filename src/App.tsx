import React, { useState } from 'react';
import { Lock, Upload, CheckCircle2, Copy, AlertTriangle } from 'lucide-react';
import { encryptFile, decryptFile } from './crypto';
import { createClient } from '@supabase/supabase-js';

type Status = 'IDLE' | 'READY' | 'ENCRYPTING' | 'DONE';
type Mode = 'LOCAL_ONLY' | 'UPLOAD';

// --- CONFIGURAZIONE LIMITI ---
const MAX_UPLOAD_MB = 50; // Limite richiesto 50MB
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const HARD_MAX_MB = 2048;
const HARD_MAX_BYTES = HARD_MAX_MB * 1024 * 1024;

// --- SUPABASE CONFIG ---
const supabaseUrl = 'https://rsnjdhkrgtuepivllvux.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbmpkaGtyZ3R1ZXBpdmxsdnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODExNTEsImV4cCI6MjA4MDc1NzE1MX0.WKxJB0TMJw3_zBvQsI3vpQxWbrT824OzdHtefgnNvPo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- UTILS ---
const sanitizeFilename = (name: string): string => {
  const base = name.split(/[\\/]/).pop() || 'file';
  const withoutAccents = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const safe = withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleaned = safe.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'file.bin';
};

const isIOSLike = () =>
  typeof navigator !== 'undefined' &&
  (/iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));

const triggerDownload = (url: string, filename: string) => {
  if (isIOSLike()) {
    window.open(url, '_blank');
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

function App() {
  // --- STATI ENCRYPT ---
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('IDLE');
  const [linkCopied, setLinkCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [isHoverEncrypt, setIsHoverEncrypt] = useState(false);
  const [currentMode, setCurrentMode] = useState<Mode | null>(null); // Traccia modalità corrente

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [keyString, setKeyString] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [encryptError, setEncryptError] = useState<string | null>(null);

  // --- STATI DECRYPT ---
  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [decryptKey, setDecryptKey] = useState<string>('');
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [decryptedFileName, setDecryptedFileName] = useState<string>('decrypted');
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isHoverDecrypt, setIsHoverDecrypt] = useState(false);

  // -------------------------
  // HANDLERS ENCRYPT
  // -------------------------

  const handleDropEncrypt = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoverEncrypt(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    validateAndSetFile(f);
  };

  const handleBrowseEncrypt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    validateAndSetFile(f);
  };

  const validateAndSetFile = (f: File) => {
    if (f.size > HARD_MAX_BYTES) {
      setEncryptError(`File too large (> ${HARD_MAX_MB} MB).`);
      return;
    }
    setFile(f);
    setStatus('READY');
    setDownloadUrl(null);
    setKeyString(null);
    setShareLink(null);
    setEncryptError(null);
    setCurrentMode(null);
  };

    const startEncrypt = async (mode: Mode) => {
    if (!file) return;
    setCurrentMode(mode);

    if (mode === 'UPLOAD' && file.size > MAX_UPLOAD_BYTES) {
      setEncryptError(`Online upload limit is ${MAX_UPLOAD_MB} MB. Use Local Mode.`);
      setStatus('READY');
      return;
    }

    try {
      setStatus('ENCRYPTING');
      setEncryptError(null);
      setLinkCopied(false);
      setKeyCopied(false);

      // 1. Cifratura locale
      const { encryptedBlob, keyString } = await encryptFile(file);
      setKeyString(keyString);

      const localUrl = URL.createObjectURL(encryptedBlob);
      setDownloadUrl(localUrl);

      // 2. Se modalità locale: AUTO DOWNLOAD + UI Success
      if (mode === 'LOCAL_ONLY') {
        triggerDownload(localUrl, `${file.name}.enc`);
        setShareLink(null);
        setStatus('DONE');
        return;
      }

      // 3. Upload su Supabase (Nome casuale per privacy totale)
      const safeName = sanitizeFilename(file.name);
      const fileExt = safeName.split('.').pop();
      
      const randomName = `${crypto.randomUUID()}.${fileExt || 'bin'}`;
      const objectPath = `files/${randomName}`;

      // *** FIX QUI SOTTO: stiamo caricando encryptedBlob, NON file ***
      const { error: uploadError } = await supabase.storage
        .from('vault-files')
        .upload(objectPath, encryptedBlob, { // <--- QUI ERA L'ERRORE SE USAVI 'file'
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        setEncryptError(`Upload failed: ${uploadError.message}`);
        setStatus('READY');
        return;
      }

      // 4. Generazione Link
      const origin = window.location.origin;
      const link = `${origin}/d/${encodeURIComponent(objectPath)}#${encodeURIComponent(keyString)}`;

      setShareLink(link);
      setStatus('DONE');
    } catch (err) {
      console.error(err);
      setEncryptError('Encryption failed.');
      setStatus('READY');
    }
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1200);
  };

  const copyKey = () => {
    if (!keyString) return;
    navigator.clipboard.writeText(keyString);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1200);
  };

  const resetEncrypt = () => {
    setFile(null);
    setStatus('IDLE');
    setLinkCopied(false);
    setKeyCopied(false);
    setIsHoverEncrypt(false);
    setDownloadUrl(null);
    setKeyString(null);
    setShareLink(null);
    setEncryptError(null);
    setCurrentMode(null);
  };

  // -------------------------
  // HANDLERS DECRYPT
  // -------------------------

  const resetDecrypt = () => {
    setEncryptedFile(null);
    setDecryptKey('');
    setDecryptedUrl(null);
    setDecryptedFileName('decrypted');
    setDecryptError(null);
    setIsHoverDecrypt(false);
  };

  const handleDropDecrypt = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoverDecrypt(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    validateAndSetEncryptedFile(f);
  };

  const handleBrowseDecrypt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) {
      resetDecrypt();
      return;
    }
    validateAndSetEncryptedFile(f);
  };

  const validateAndSetEncryptedFile = (f: File) => {
    if (f.size > HARD_MAX_BYTES) {
      setDecryptError(`File too large (> ${HARD_MAX_MB} MB).`);
      return;
    }
    setEncryptedFile(f);
    setDecryptedUrl(null);
    setDecryptError(null);

    let baseName = f.name;
    if (baseName.toLowerCase().endsWith('.enc')) {
      baseName = baseName.slice(0, -4);
    }
    baseName = baseName.replace(/\s\(\d+\)$/, '');
    setDecryptedFileName(baseName || 'decrypted');
  };

  const handleDecrypt = async () => {
    if (!encryptedFile || !decryptKey) return;

    try {
      setDecryptError(null);
      setDecryptedUrl(null);

      const decryptedBlob = await decryptFile(encryptedFile, decryptKey);
      const url = URL.createObjectURL(decryptedBlob);
      setDecryptedUrl(url);

      // --- AUTO DOWNLOAD ---
      triggerDownload(url, decryptedFileName);
      
    } catch (e) {
      console.error(e);
      setDecryptError('Decryption failed. Invalid key/file.');
    }
  };

  // -------------------------
  // UI RENDER
  // -------------------------

  return (
    <div className="min-h-screen bg-[#050b10] text-[15px] text-emerald-100 flex items-center justify-center font-mono overflow-hidden">
      {/* Container compatto per stare in una pagina (max-w-6xl) */}
      <div className="w-full max-w-6xl px-6 py-6 transform origin-top">
        
        {/* HEADER */}
        <header className="mb-6">
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="inline-block px-2 py-0.5 border border-emerald-700 text-[15px] tracking-[0.15em] uppercase font bg-emerald-900/10">
                  void.sh
                </span>
                <span className="text-[12px] text-emerald-500 uppercase tracking-[0.2em] animate-pulse">
                  _beta _V1.0
                </span>
              </div>
              <p className="text-[14px] text-emerald-300/90 font-light tracking-tight mt-1">
                &gt; Secure In-Browser Encryption. Zero Knowledge.
              </p>
            </div>
            <div className="text-right text-[12px] text-emerald-500 space-y-0.5 hidden sm:block opacity-70">
              <p>[ CLIENT-SIDE ONLY ]</p>
              <p>[ OPEN SOURCE ]</p>
              <p>[ NO USER LOGS ]</p>
            </div>
          </div>
          <div className="h-px bg-emerald-900/50 mt-4" />
        </header>

        {/* MAIN GRID */}
        <main className="flex flex-col lg:flex-row gap-6">
          
          {/* --- LEFT PANEL: ENCRYPT --- */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <div className="bg-[#0a1219] border border-emerald-900/40 rounded-xl p-6 h-full flex flex-col shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>

              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[14px] text-emerald-400 tracking-widest font-bold">:: ENCRYPT ::</span>
                <span className="text-[12px] text-emerald-600">
                  [{status === 'IDLE' ? ' IDLE ' : status === 'READY' ? ' READY ' : status === 'ENCRYPTING' ? ' BUSY ' : ' DONE '}]
                </span>
              </div>

              <div className="text-[12px] space-y-1 mb-4 opacity-70 relative z-10">
                <p className="text-emerald-300/90">&gt; algo: AES-256-GCM</p>
                <p className="text-emerald-300/90">&gt; key: generated locally</p>
              </div>
              <div className="h-px bg-emerald-900/30 mb-6 relative z-10" />

              {/* DROP AREA */}
              {(status === 'IDLE' || status === 'READY') && (
                <div
                  className={`
                    relative flex-1 flex flex-col items-center justify-center px-4 py-8 
                    border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer z-10
                    ${isHoverEncrypt 
                      ? 'border-emerald-400 bg-emerald-500/10' 
                      : 'border-emerald-800/60 bg-black/20 hover:border-emerald-500/50 hover:bg-black/40'}
                  `}
                  onDragOver={(e) => { e.preventDefault(); setIsHoverEncrypt(true); }}
                  onDragLeave={() => setIsHoverEncrypt(false)}
                  onDrop={handleDropEncrypt}
                >
                  <Upload className={`mb-3 ${isHoverEncrypt ? 'text-emerald-300' : 'text-emerald-500/70'}`} size={32} />
                  
                  {!file ? (
                    <>
                      <p className="text-[16px] font-bold text-emerald-100">DROP FILE HERE</p>
                      <p className="text-emerald-400/60 text-[13px] mt-2">[ or click to browse ]</p>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBrowseEncrypt} />
                    </>
                  ) : (
                    <div className="w-full text-center">
                      <div className="bg-emerald-900/20 border border-emerald-700/50 rounded p-3 inline-block max-w-full">
                        <p className="font-bold truncate px-2 text-[15px]">{file.name}</p>
                        <p className="text-[12px] text-emerald-400/70 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <p className="text-[12px] text-emerald-500/50 mt-3">&gt; Click to change file &lt;</p>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBrowseEncrypt} />
                    </div>
                  )}
                </div>
              )}

              {/* ACTIONS AREA */}
              {status === 'READY' && file && (
                <div className="mt-6 flex flex-col gap-3 z-10">
                  <button
                    className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[14px] rounded transition-colors uppercase tracking-wide"
                    onClick={() => startEncrypt('UPLOAD')}
                  >
                    <Lock size={16} /> Encrypt & Share Link
                    <span className="text-[10px] opacity-70 ml-1">(MAX 50MB)</span>
                  </button>
                  
                  <div className="flex gap-3">
                    <button
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-900/20 border border-emerald-700/50 hover:bg-emerald-800/40 text-emerald-100 font-bold text-[13px] rounded transition-colors uppercase"
                      onClick={() => startEncrypt('LOCAL_ONLY')}
                    >
                      Local Encrypt Only
                    </button>
                    <button
                      className="px-4 py-3 bg-black/40 border border-emerald-900 hover:border-red-900/50 text-emerald-500/60 hover:text-red-400 rounded transition-colors uppercase font-bold text-[13px]"
                      onClick={resetEncrypt}
                    >
                      X
                    </button>
                  </div>
                </div>
              )}

              {/* LOADING STATE */}
              {status === 'ENCRYPTING' && (
                <div className="mt-8 flex flex-col items-center justify-center text-emerald-300 animate-pulse z-10">
                  <Lock size={36} className="mb-3" />
                  <p className="text-[15px] tracking-widest">ENCRYPTING_DATA...</p>
                </div>
              )}

              {/* DONE STATE: LOCAL ONLY */}
              {status === 'DONE' && currentMode === 'LOCAL_ONLY' && (
                 <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded text-center animate-in fade-in zoom-in duration-300 z-10">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                    <p className="text-[16px] font-bold text-emerald-100 uppercase tracking-wide">ENCRYPTION SUCCESSFUL!</p>
                    <p className="text-[13px] text-emerald-400/70 mb-4">Download started automatically.</p>
                    
                    <button
                      onClick={() => downloadUrl && triggerDownload(downloadUrl, `${file?.name || 'file'}.enc`)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 text-emerald-100 rounded text-[13px] transition-colors font-bold uppercase"
                    >
                      DOWNLOAD AGAIN
                    </button>

                    {/* KEY DISPLAY */}
                    {keyString && (
                        <div className="mt-4 text-left">
                          <p className="text-[12px] text-emerald-400/80 mb-1 uppercase tracking-wider font-bold flex items-center gap-2">
                            &gt; Decryption Key <AlertTriangle size={12} className="text-yellow-500" />
                          </p>
                          <div className="flex gap-2">
                            <input readOnly value={keyString} className="flex-1 bg-black/30 border border-emerald-800 rounded px-2 py-1 text-[12px] text-emerald-200 font-mono outline-none"/>
                             <button
                              onClick={copyKey}
                              className="px-3 py-2 bg-emerald-600/20 border border-emerald-600/50 hover:bg-emerald-500 hover:text-black text-emerald-300 rounded transition-all font-bold uppercase text-[12px] min-w-[70px] flex items-center justify-center gap-1"
                            >
                              {keyCopied ? 'COPIED!' : <><Copy size={12}/> COPY</>}
                            </button>
                          </div>
                          <p className="text-[11px] text-emerald-500/50 mt-1 font-bold">
                            !! SAVE THIS KEY. NO RECOVERY POSSIBLE. !!
                          </p>
                        </div>
                    )}
                    
                    <button
                      className="block w-full mt-4 text-[11px] text-emerald-500/50 hover:text-emerald-300 uppercase tracking-widest"
                      onClick={resetEncrypt}
                    >
                      [ START NEW ]
                    </button>
                 </div>
              )}

              {/* DONE STATE: UPLOAD (LINK) */}
              {status === 'DONE' && currentMode === 'UPLOAD' && (
                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 z-10">
                  <div className="flex items-center gap-2 text-emerald-300 bg-emerald-900/20 p-3 rounded border border-emerald-800/50">
                    <CheckCircle2 size={20} />
                    <span className="font-bold tracking-wide text-[14px]">ENCRYPTION SUCCESSFUL</span>
                  </div>

                  {/* SHARE LINK SECTION */}
                  {shareLink && (
                    <div>
                      <p className="text-[12px] text-emerald-400/80 mb-1 uppercase tracking-wider font-bold">&gt; Share Link</p>
                      <div className="flex gap-2">
                        <input 
                          readOnly 
                          value={shareLink} 
                          className="flex-1 bg-black/30 border border-emerald-800 rounded px-3 py-2 text-[13px] text-emerald-200 outline-none focus:border-emerald-500 font-mono"
                        />
                        <button
                          onClick={copyLink}
                          className="px-3 py-2 bg-emerald-600/20 border border-emerald-600/50 hover:bg-emerald-500 hover:text-black text-emerald-300 rounded transition-all font-bold uppercase text-[12px] min-w-[70px]"
                        >
                          {linkCopied ? 'COPIED!' : 'COPY'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* KEY SECTION */}
                  {/*{keyString && (
                    <div>
                      <p className="text-[12px] text-emerald-400/80 mb-1 uppercase tracking-wider font-bold flex items-center gap-2">
                        &gt; Decryption Key <AlertTriangle size={12} className="text-yellow-500" />
                      </p>
                      <div className="flex gap-2">
                        <input 
                          readOnly 
                          value={keyString} 
                          className="flex-1 bg-black/30 border border-emerald-800 rounded px-3 py-2 text-[13px] text-emerald-200 font-mono outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={copyKey}
                          className="px-3 py-2 bg-emerald-600/20 border border-emerald-600/50 hover:bg-emerald-500 hover:text-black text-emerald-300 rounded transition-all font-bold uppercase text-[12px] min-w-[70px] flex items-center justify-center gap-1"
                        >
                           {keyCopied ? 'COPIED!' : <><Copy size={12}/> COPY</>}
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-500/50 mt-1 font-bold">
                        !! USE IT IF YOU LOST THE SHARE LINK !!
                      </p>
                    </div>
                  )}*/}

                  <button
                    className="w-full mt-4 py-2 text-[12px] text-emerald-500/60 hover:text-emerald-300 transition-colors uppercase tracking-widest"
                    onClick={resetEncrypt}
                  >
                    [ START NEW SESSION ]
                  </button>
                </div>
              )}

              {/* ERROR MESSAGE */}
              {encryptError && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded text-red-200 text-[13px] font-bold z-10">
                  ERROR: {encryptError}
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT PANEL: DECRYPT --- */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <div className="bg-[#0a1219] border border-emerald-900/40 rounded-xl p-6 h-full flex flex-col shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[14px] text-emerald-400 tracking-widest font-bold">:: DECRYPT ::</span>
                <span className="text-[12px] text-emerald-600 font">[ LOCAL ]</span>
              </div>

              <div className="text-[12px] space-y-1 mb-4 opacity-70 relative z-10">
                <p className="text-emerald-300/90">&gt; input: .enc file</p>
                <p className="text-emerald-300/90">&gt; output: original file</p>
              </div>
              <div className="h-px bg-emerald-900/30 mb-6 relative z-10" />

              {/* DROP AREA DECRYPT */}
              <div
                className={`
                  relative flex-col items-center justify-center px-4 py-8 
                  border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer mb-6 z-10
                  ${isHoverDecrypt 
                    ? 'border-emerald-400 bg-emerald-500/10' 
                    : 'border-emerald-800/60 bg-black/20 hover:border-emerald-500/50 hover:bg-black/40'}
                  ${decryptedUrl ? 'hidden' : 'flex'} 
                `}
                onDragOver={(e) => { e.preventDefault(); setIsHoverDecrypt(true); }}
                onDragLeave={() => setIsHoverDecrypt(false)}
                onDrop={handleDropDecrypt}
              >
                {!encryptedFile ? (
                  <>
                    <Upload className="mb-3 text-emerald-500/70" size={32} />
                    <p className="text-[16px] font-bold text-emerald-100">DROP .ENC FILE</p>
                    <input type="file" accept=".enc" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBrowseDecrypt} />
                  </>
                ) : (
                  <div className="w-full text-center">
                    <div className="bg-emerald-900/20 border border-emerald-700/50 rounded p-2 inline-block">
                      <p className="font-bold text-[14px]">{encryptedFile.name}</p>
                    </div>
                    <p className="text-[12px] text-emerald-500/50 mt-2">[ Click to replace ]</p>
                    <input type="file" accept=".enc" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBrowseDecrypt} />
                  </div>
                )}
              </div>

              {/* DECRYPT INPUTS */}
              <div className="flex-1 relative z-10">
                <label className="block text-[12px] text-emerald-400/80 mb-2 uppercase tracking-wider font-bold">&gt; ENTER KEY</label>
                <input
                  type="text"
                  className="w-full bg-black/30 border border-emerald-800 rounded px-3 py-3 text-emerald-100 placeholder-emerald-800/50 focus:border-emerald-500 outline-none transition-colors font-mono text-[14px]"
                  placeholder="Paste key string..."
                  value={decryptKey}
                  onChange={(e) => setDecryptKey(e.target.value)}
                />

                <button
                  className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900/30 disabled:text-emerald-700 text-black font-bold rounded transition-colors flex items-center justify-center gap-3 uppercase tracking-wide text-[14px]"
                  onClick={handleDecrypt}
                  disabled={!encryptedFile || !decryptKey}
                >
                  <Lock size={16} /> Decrypt File
                </button>

                {decryptError && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded text-red-200 text-[13px] font-bold">
                    ERROR: {decryptError}
                  </div>
                )}

                {/* SUCCESS STATE */}
                {decryptedUrl && (
                  <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded text-center animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                    <p className="text-[16px] font-bold text-emerald-100 uppercase tracking-wide">DECRYPTED!</p>
                    <p className="text-[13px] text-emerald-400/70 mb-4">Download started automatically.</p>
                    
                    <button
                      onClick={() => decryptedUrl && triggerDownload(decryptedUrl, decryptedFileName)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 text-emerald-100 rounded text-[13px] transition-colors font-bold uppercase"
                    >
                      DOWNLOAD AGAIN
                    </button>
                    
                    <button
                      className="block w-full mt-4 text-[11px] text-emerald-500/50 hover:text-emerald-300 uppercase tracking-widest"
                      onClick={resetDecrypt}
                    >
                      [ DECRYPT ANOTHER ]
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

        </main>

        {/* FOOTER INFO */}
        <footer className="mt-8 text-center opacity-60">
           <p className="text-[12px] text-emerald-500/60 max-w-3xl mx-auto leading-relaxed font-light">
             // SECURITY NOTICE: WE CANNOT SEE CONTENTS. FILES ARE STORED AS RANDOMIZED, ENCRYPTED BLOBS. <br/>
             // UPLOAD LIMIT: {MAX_UPLOAD_MB}MB (Online) / UNLIMITED (Local) <br/>
             // WARNING: LARGE FILES (&gt;1GB) MAY REQUIRE SIGNIFICANT RAM
           </p>
        </footer>

      </div>
    </div>
  );
}

export default App;
