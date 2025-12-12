import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Download, AlertTriangle, CheckCircle2, FileDown, Copy, Lock, EyeOff, Eye, Unlock } from 'lucide-react';
import { decryptFile } from './crypto';

// --- SUPABASE CONFIG ---
const supabaseUrl = 'https://rsnjdhkrgtuepivllvux.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbmpkaGtyZ3R1ZXBpdmxsdnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODExNTEsImV4cCI6MjA4MDc1NzE1MX0.WKxJB0TMJw3_zBvQsI3vpQxWbrT824OzdHtefgnNvPo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DownloadPage: React.FC = () => {
const [status, setStatus] = useState<'INITIALIZING' | 'DOWNLOADING' | 'DECRYPTING' | 'COMPLETED' | 'ERROR' | 'PASSWORD_REQUIRED'>('INITIALIZING');
  const [error, setError] = useState<string | null>(null);
  
  const decryptedUrlRef = useRef<string | null>(null);
  const downloadStartedRef = useRef(false); // Flag per evitare doppi download
  const [fileName, setFileName] = useState<string>('decrypted_file');

  const [showKeyInfo, setShowKeyInfo] = useState(false); // Stato per mostrare la key dopo il click

  const [inputPassword, setInputPassword] = useState(''); // Password inserita dall'utente
  const [encryptedBlob, setEncryptedBlob] = useState<Blob | null>(null); // Salviamo il file criptato

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Se abbiamo già iniziato il processo, fermati
    if (downloadStartedRef.current) return;
    downloadStartedRef.current = true;

    const processDownload = async () => {
      try {
        setStatus('DOWNLOADING');

        const path = window.location.pathname;
        const hash = window.location.hash;

        // RECUPERO CHIAVE DALL'URL (Se c'è)
        let urlKey = '';
        if (hash && hash.length > 1) {
            urlKey = decodeURIComponent(hash.substring(1));
        }

        const prefix = '/d/';
        if (!path.startsWith(prefix)) {
          throw new Error('Invalid download link.');
        }

        const encodedObjectPath = path.slice(prefix.length);
        const objectPath = decodeURIComponent(encodedObjectPath);

        const serverFileName = objectPath.split('/').pop() || 'file';

        // Rimuovi il prefisso UUID se presente (formato: uuid_nomefile)
        // Regex cerca: 8-4-4-4-12 caratteri esadecimali seguiti da underscore
        let cleanName = serverFileName.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/, '');

        // Rimuovi estensione finale .enc o .bin
        cleanName = cleanName.replace(/\.enc$/, '').replace(/\.bin$/, '');

        setFileName(cleanName);

        // 2. Scarica il file cifrato
        const { data, error: downloadError } = await supabase.storage
            .from('vault-files')
            .download(objectPath);

        if (downloadError || !data) {
            throw new Error('File download failed. It may have been deleted.');
        }

        const encBlob = new Blob([data]); // Assicurati sia un Blob
        setEncryptedBlob(encBlob);

        // SALVIAMO IL BLOB CRIPTATO (Ci serve se dobbiamo chiedere la password)
        const encFile = new Blob([data]);
        setEncryptedBlob(encFile);

        setStatus('DECRYPTING');

        // 3. DECISIONE: DECRIPTARE O CHIEDERE PASSWORD?
        if (urlKey) {
            // SCENARIO A: C'è la chiave nel link -> Decripta subito
            setStatus('DECRYPTING');
            
            try {
                // Nota: decryptFile ora accetta Blob o File. encFile è un Blob.
                // Se TypeScript si lamenta del tipo, usa: encFile as any o crea un new File([encFile], "name")
                const blobToDecrypt = new File([encFile], "temp.enc"); 
                
                // --- QUI DEFINIAMO decryptedBlob ---
                const decryptedBlob = await decryptFile(blobToDecrypt, urlKey);
                
                // --- E LO USIAMO SUBITO QUI DENTRO ---
                const url = URL.createObjectURL(decryptedBlob);
                decryptedUrlRef.current = url;
                setStatus('COMPLETED');
                
                // Auto download (opzionale)
                // Auto-trigger download (una sola volta grazie al ref, ma per sicurezza mettiamo un check)
                setTimeout(() => triggerDownload(url, cleanName), 600);


            } catch (e) {
                console.error(e);
                setError("Decryption failed. Invalid key in link.");
                setStatus('ERROR');
            }

        } else {
            // SCENARIO B: Nessuna chiave -> Chiedi Password
            setStatus('PASSWORD_REQUIRED');
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Processing failed.');
        setStatus('ERROR');
      }
    };

    processDownload();
    
    return () => {
        if (decryptedUrlRef.current) {
            URL.revokeObjectURL(decryptedUrlRef.current);
        }
    };
  }, []);

  const triggerDownload = (url: string, name: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
  };

  const handlePasswordSubmit = async () => {
    if (!encryptedBlob || !inputPassword) return;

    try {
        setStatus('DECRYPTING');
        // Tentativo di decrittazione con la password inserita
        const decryptedBlob = await decryptFile(encryptedBlob as any, inputPassword);
        
        const url = URL.createObjectURL(decryptedBlob);
        decryptedUrlRef.current = url;

        setStatus('COMPLETED');

        setTimeout(() => {
             triggerDownload(url, fileName);
        }, 600);
        
    } catch (e) {
        console.error(e);
        setError("Incorrect password or corrupted file.");
        setStatus('PASSWORD_REQUIRED'); // Torna all'input ma con errore
    }
  };

  const handleManualDownload = () => {
    if (decryptedUrlRef.current) {
        triggerDownload(decryptedUrlRef.current, fileName);
    }
  };

  const handleDownloadSource = () => {
    if (!encryptedBlob) return;
    
    // Crea un URL temporaneo per il blob criptato
    const url = URL.createObjectURL(encryptedBlob);
    
    // Nome file: se abbiamo fileName decriptato (es. "foto.jpg"), 
    // il sorgente sarà "foto.jpg.enc"
    const sourceName = `${fileName}.enc`;
    
    triggerDownload(url, sourceName);
    
    // Mostra anche le info chiave (opzionale, ma utile)
    setShowKeyInfo(true);
};


  return (
    <div className="min-h-screen bg-[#050b10] text-[15px] text-emerald-100 flex items-center justify-center font-mono relative overflow-hidden">
        {/* Background Noise & Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
        
        {/* Main Card - MODIFICATO: max-w-lg per renderlo più grande (+30% circa) */}
        <div className="relative z-10 w-full max-w-lg px-8 py-10"> 
            
            {/* LOGO */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 mb-2 opacity-80">
                   <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_#10b981]"></div>
                   <span className="tracking-[0.25em] text-[12px] font-bold text-emerald-500 uppercase">void.sh</span>
                </div>
            </div>

            {/* STATUS: ERROR */}
            {status === 'ERROR' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center animate-in zoom-in-95">
                    <AlertTriangle className="mx-auto text-red-500 mb-4 opacity-80" size={32} />
                    <h2 className="text-red-400 font-bold mb-2 uppercase tracking-wide text-lg">Link Expired or Invalid</h2>
                    <p className="text-red-300/60 text-[13px] leading-relaxed">{error}</p>
                </div>
            )}

            {/* STATUS: LOADING */}
            {(status === 'INITIALIZING' || status === 'DOWNLOADING' || status === 'DECRYPTING') && (
                <div className="text-center animate-in fade-in duration-500 py-10">
                    <div className="relative w-16 h-16 mx-auto mb-8">
                        <div className="absolute inset-0 border-2 border-emerald-900 rounded-full"></div>
                        <div className="absolute inset-0 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-emerald-400/80 text-[13px] uppercase tracking-widest animate-pulse font-bold">
                        {status === 'DOWNLOADING' ? 'Retrieving Secure Data...' : 'Decrypting Content...'}
                    </p>
                </div>
            )}

            {/* STATUS: PASSWORD REQUIRED */}
            {status === 'PASSWORD_REQUIRED' && (
                <div className="text-center animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                        <Lock size={32} className="text-emerald-400" />
                    </div>
                    
                    <h1 className="text-xl font-bold text-white mb-2 tracking-tight">SECURE FILE</h1>
                    <p className="text-emerald-500/50 text-[13px] mb-8 uppercase tracking-wider font-medium px-4">
                      This file is password protected.
                    </p>
                    
                    {/* Error Message se password sbagliata */}
                    {error && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 p-2 rounded text-[11px] text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                      {/* Contenitore relativo per Input + Occhio */}
                      <div className="relative">
                          <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter Decryption Password..."
                              value={inputPassword}
                              onChange={(e) => setInputPassword(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                              className="w-full bg-black/40 border border-emerald-800 rounded px-4 py-3 text-[13px] text-emerald-100 focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-800 text-center pr-10" // pr-10 lascia spazio all'occhio
                              autoFocus
                          />
                          
                          {/* Tasto Occhio posizionato dentro l'input */}
                          <button
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50 hover:text-emerald-300 transition-colors z-10"
                              type="button"
                              title={showPassword ? "Hide Password" : "Show Password"}
                          >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                      </div>
                      
                      {/* Bottone Decrypt Sotto */}
                      <button
                          onClick={handlePasswordSubmit}
                          disabled={!inputPassword}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-lg text-[14px] transition-all shadow-xl hover:shadow-emerald-500/20 flex items-center justify-center gap-2 uppercase tracking-wide mb-4 transform hover:-translate-y-0.5"
                    >
                        <Unlock size={18} /> Unlock & Decrypt
                      </button>
                  </div>

                </div>
            )}


            {/* STATUS: COMPLETED */}
            {status === 'COMPLETED' && (
                <div className="text-center animate-in slide-in-from-bottom-4 duration-500">

                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                        <CheckCircle2 size={32} className="text-emerald-400" />
                    </div>
                    
                    <p className="text-emerald-100/60 mb-2 font-light text-[24px]">
                      Decryption successful.
                    </p>
                    <p className="text-[11px] text-emerald-500/50 mb-8 uppercase tracking-wider animate-pulse font-bold text-[12px]">
                      Download started automatically...
                    </p>

                    <button
                        onClick={handleManualDownload}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-lg text-[14px] transition-all shadow-xl hover:shadow-emerald-500/20 flex items-center justify-center gap-2 uppercase tracking-wide mb-4 transform hover:-translate-y-0.5"
                    >
                        <Download size={18} /> Download Again
                    </button>
 
                    <button
                        onClick={handleDownloadSource}
                        className="w-full bg-transparent hover:bg-emerald-900/20 border border-emerald-800/50 text-emerald-400/70 hover:text-emerald-300 font-bold py-3 rounded-lg text-[12px] transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                    >
                       <FileDown size={16} /> {showKeyInfo ? 'Hide Source Info' : 'Download Encrypted Source'}
                    </button>

                    {/* SEZIONE CHIAVE (Ora con Copy funzionante e Feedback) */}
                    {showKeyInfo && (
                        <div className="mt-8 border-t border-emerald-900/30 pt-6 animate-in fade-in slide-in-from-top-2">
                            <p className="text-[11px] text-emerald-500/60 uppercase tracking-widest font-bold mb-3 flex items-center justify-center gap-2">
                                <AlertTriangle size={12} className="text-yellow-500/70"/> Decryption Key / Password
                            </p>

                            <div className="bg-black/40 border border-emerald-900/50 rounded-lg p-1.5 flex items-center gap-2 shadow-inner relative">
    
                              {/* Input sola lettura che funge da display (così possiamo usare type="password") */}
                              <input 
                                  type={showPassword ? "text" : "password"} // Riutilizziamo lo stato showPassword o ne crei uno nuovo locale
                                  readOnly
                                  value={window.location.hash.length > 1 ? window.location.hash.substring(1) : inputPassword}
                                  className="flex-1 bg-transparent border-none text-[13px] text-emerald-300/90 font-mono outline-none px-2 w-full"
                              />

                              {/* Gruppo bottoni a destra */}
                              <div className="flex items-center gap-1">
                                  {/* Tasto Occhio */}
                                  <button
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="p-2 text-emerald-500/40 hover:text-emerald-300 transition-colors"
                                      title="Toggle visibility"
                                  >
                                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>

                                  {/* Separatore verticale sottile */}
                                  <div className="h-4 w-[1px] bg-emerald-800/50 mx-1"></div>

                                  {/* Tasto Copia con feedback */}
                                  <button 
                                      onClick={() => {
                                          const textToCopy = window.location.hash.length > 1 ? window.location.hash.substring(1) : inputPassword;
                                          navigator.clipboard.writeText(textToCopy);
                                          
                                          // Feedback Visivo (cambia icona o colore per un attimo)
                                          const btn = document.getElementById('copy-icon-btn');
                                          if(btn) {
                                              btn.classList.add('text-emerald-400', 'scale-125');
                                              setTimeout(() => btn.classList.remove('text-emerald-400', 'scale-125'), 200);
                                          }
                                      }}
                                      id="copy-icon-btn"
                                      className="p-2 hover:bg-emerald-500/10 rounded-md text-emerald-500/60 hover:text-emerald-300 transition-all active:scale-95"
                                      title="Copy to clipboard"
                                  >
                                      <Copy size={18} />
                                  </button>
                              </div>
                          </div>

                            <p className="mt-4 text-[11px] text-emerald-700/50 italic text-center">
                                * This key is required to decrypt the file manually later.
                            </p>
                        </div>
                    )}


                </div>
            )}
        </div>
        
        <div className="absolute bottom-8 text-[11px] text-emerald-900/40 uppercase tracking-widest pointer-events-none font-bold">
            End-to-End Encrypted Transfer
        </div>
    </div>
);


};

export default DownloadPage;
