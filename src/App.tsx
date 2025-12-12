import React, { useState, useEffect, useRef } from 'react';
import { Lock, Upload, CheckCircle2, Copy, AlertTriangle, Cloud, Computer, Settings, Eye, EyeOff, X, Shuffle} from 'lucide-react';
import { encryptFile, decryptFile } from './crypto';
import { createClient } from '@supabase/supabase-js';
import { Dropbox, DropboxAuth } from 'dropbox';


type Status = 'IDLE' | 'READY' | 'ENCRYPTING' | 'DONE';
type Mode = 'LOCAL_ONLY' | 'UPLOAD' | 'DROPBOX';


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
/*const sanitizeFilename = (name: string): string => {
  const base = name.split(/[\\/]/).pop() || 'file';
  const withoutAccents = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const safe = withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleaned = safe.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'file.bin';
};*/

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

const DROPBOX_APP_KEY = '7oq2zp76471dpxt'; // <--- INSERISCI LA TUA KEY DROPBOX
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin + '/' : '';

function App() {

  const advancedSettingsRef = useRef<HTMLDivElement>(null);

  // --- STATI ENCRYPT ---
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('IDLE');
  const [linkCopied, setLinkCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [isHoverEncrypt, setIsHoverEncrypt] = useState(false);
  const [currentMode, setCurrentMode] = useState<Mode | null>(null);

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

  const [dbxToken, setDbxToken] = useState<string | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [customPassword, setCustomPassword] = useState('');
  const [hideExtension, setHideExtension] = useState(false); // Per .bin camuffamento
  //const [steganographyEnabled, setSteganographyEnabled] = useState(false); // Placeholder per futuro

  const [showPasswordText, setShowPasswordText] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [useRandomName, setUseRandomName] = useState(false);

  //const [keyToDisplay, setKeyToDisplay] = useState<string | null>(null);
  //const [autoDecrypt, setAutoDecrypt] = useState(true); // Default true

  // -------------------------
  // HANDLERS ENCRYPT
  // -------------------------

  useEffect(() => {
    if (window.location.hash.includes('access_token') && window.location.hash.includes('token_type=bearer')) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        // SCENARIO POPUP: Se questa pagina è aperta dentro un popup (ha un opener)
        if (window.opener) {
          // Manda il token alla finestra principale
          window.opener.postMessage({ type: 'DROPBOX_TOKEN', token: accessToken }, window.location.origin);
          // Chiudi il popup
          window.close();
        } else {
          // SCENARIO REDIRECT STANDARD (Fallback): Se non è un popup, salva il token e resta qui
          setDbxToken(accessToken);
          window.history.replaceState(null, '', ' '); // Pulisci l'URL
          console.log("Dropbox Connected via Redirect!");
        }
      }
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verifica sicurezza: accetta messaggi solo dalla tua stessa origine
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'DROPBOX_TOKEN' && event.data.token) {
        setDbxToken(event.data.token);
        console.log("Dropbox Connected via Popup Message!");
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (showAdvanced && advancedSettingsRef.current) {
      // Aspetta un attimo che l'animazione inizi/finisca per calcolare bene l'altezza
      setTimeout(() => {
        advancedSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showAdvanced]);


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

  const handleDropboxAuth = async () => {
    const dbxAuth = new DropboxAuth({ clientId: DROPBOX_APP_KEY });
    const url = await dbxAuth.getAuthenticationUrl(REDIRECT_URI, undefined, 'token');
    
    // Apri un popup centrato
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    window.open(url.toString(), 'dropbox_oauth', `width=${width},height=${height},top=${top},left=${left}`);
  };


  const startEncrypt = async (mode: Mode) => {
    if (!file) return;
    setCurrentMode(mode);

    if (mode === 'DROPBOX' && !dbxToken) {
       handleDropboxAuth();
       return;
    }

    if (mode === 'UPLOAD' && file.size > MAX_UPLOAD_BYTES) {
      setEncryptError(`Online upload limit is ${MAX_UPLOAD_MB} MB. Use Local Mode.`);
      setStatus('READY');
      return;
    }

    // VALIDAZIONE PASSWORD CUSTOM
    if (usePassword) {
       if (!customPassword) {
         setEncryptError("Please enter a custom password.");
         return;
       }
       if (customPassword !== confirmPassword) {
         setEncryptError("Passwords do not match.");
         return;
       }
    }

    try {
      setStatus('ENCRYPTING');
      setEncryptError(null);
      setLinkCopied(false);
      setKeyCopied(false);

      // 1. Cifratura locale
      // Passiamo customPassword solo se usePassword è true, altrimenti undefined/null
      const passwordToUse = usePassword ? customPassword : undefined;

      const { encryptedBlob, keyString: usedKey } = await encryptFile(file, passwordToUse);

      // Se abbiamo usato la password custom, la chiave usata è quella.
      // Se non l'abbiamo usata, encryptFile ne ha generata una.
      const finalKeyString = usedKey; 

      setKeyString(finalKeyString);
      setShowPasswordText(false);

      const localUrl = URL.createObjectURL(encryptedBlob);
      setDownloadUrl(localUrl);

      let finalBaseName = file.name;

      // 1. Se l'utente vuole un nome casuale
      if (useRandomName) {
        // Genera una stringa random (es. "a1b2c3d4")
        const randomString = Math.random().toString(36).substring(2, 10); 
        // Se vuole mantenere l'estensione originale anche col nome random:
        const extOriginal = file.name.split('.').pop();
        finalBaseName = `${randomString}.${extOriginal}`;
        
        // OPPURE: Nome totalmente random senza estensione originale (più sicuro per privacy)
        //finalBaseName = randomString;
      }

      if (hideExtension) {
        // Rimuove l'estensione originale e mette .bin
        const lastDotIndex = finalBaseName.lastIndexOf('.');
        if (lastDotIndex !== -1) {
          finalBaseName = finalBaseName.substring(0, lastDotIndex) + '.bin';
        } else {
          finalBaseName = finalBaseName + '.bin';
        }
      }

      // 2. Aggiunge SEMPRE .enc alla fine
      const finalFileName = `${finalBaseName}.enc`;

      // 2. Se modalità locale: AUTO DOWNLOAD + UI Success
      if (mode === 'LOCAL_ONLY') {
        triggerDownload(localUrl, finalFileName);
        setShareLink(null);
        setStatus('DONE');
        setShowAdvanced(false); // <--- CHIUDE LE IMPOSTAZIONI
        return;
      }

      // CASO 2: DROPBOX
      if (mode === 'DROPBOX') {
        if (!dbxToken) throw new Error("Dropbox token missing");

        const dbx = new Dropbox({ accessToken: dbxToken });
        const dbxPath = `/${finalFileName}`; // Usa il nome corretto con estensione giusta

        const fileToUpload = new File([encryptedBlob], finalFileName, { type: 'application/octet-stream' });

        console.log("Uploading to Dropbox...", dbxPath);

        await dbx.filesUpload({
          path: dbxPath,
          contents: fileToUpload,
          mode: { '.tag': 'overwrite' }
        });

        setShareLink(null);
        setStatus('DONE');
        setShowAdvanced(false); // <--- CHIUDE LE IMPOSTAZIONI
        return;
      }

      // 3. Upload su Supabase
    
      // Calcoliamo il nome finale da salvare nello storage
      let storageFileName = '';

      if (useRandomName) {
          const ext = finalFileName.split('.').pop() || 'bin';
          storageFileName = `${crypto.randomUUID()}.${ext}`;
      } else {
          storageFileName = `${crypto.randomUUID()}_${finalFileName}`;
      }

      const objectPath = `files/${storageFileName}`;

      const { error: uploadError } = await supabase.storage
          .from('vault-files')
          .upload(objectPath, encryptedBlob, { 
            contentType: 'application/octet-stream',
            upsert: false,
          });

      if (uploadError) {
       console.error('Supabase upload error:', uploadError);
       throw new Error("Upload failed: " + uploadError.message);
      }

      // 4. Generazione Link
      const encodedObjectPath = encodeURIComponent(objectPath); // es. files%2Fnome.enc
      // COSTRUIAMO IL LINK
      const baseUrl = `${window.location.origin}/d/${encodedObjectPath}`;
      // SE USO PASSWORD: Il link è pulito (senza hash). L'utente dovrà scriverla.
      // SE NON USO PASSWORD: La chiave è nel link (#key) per accesso diretto.
      const finalLink = usePassword 
          ? baseUrl 
          : `${baseUrl}#${encodeURIComponent(finalKeyString)}`;
      setShareLink(finalLink);

      setStatus('DONE');

    } catch (err: any) {
      console.error(err);
      setEncryptError(err.message || "Encryption failed");
      setStatus('IDLE');
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
    // Reset stati di base
    setFile(null);
    setStatus('IDLE');
    setLinkCopied(false);
    setKeyCopied(false);
    setIsHoverEncrypt(false);
    setDownloadUrl(null);
    setKeyString(null);
    setShareLink(null);

    // --- AGGIUNTO: RESET IMPOSTAZIONI ---
    setUsePassword(false);
    setCustomPassword('');
    setConfirmPassword('');
    setHideExtension(false);
    setUseRandomName(false); // <--- Reset nome casuale
    setShowAdvanced(false);  // <--- Chiude il menu
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

      const originalName = encryptedFile.name.replace(/\.enc$/i, ''); // Diventa "documento.pdf"
      setDecryptedFileName(originalName); 

      setDecryptedUrl(url);

      // --- AUTO DOWNLOAD ---
      triggerDownload(url, decryptedFileName);
      
    } catch (e) {
      console.error(e);
      setDecryptError('Decryption failed. Invalid key/file.');
    }
  };

  const handleReset = () => {
  setFile(null);
  setStatus('IDLE');
  setDownloadUrl(null);
  setShareLink(null);
  setKeyString(null);
  
  // Reset Impostazioni
  setUsePassword(false);
  setCustomPassword('');
  setConfirmPassword('');
  setHideExtension(false);
  setShowAdvanced(false);
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
                  _beta _V1.1
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
              {(status === 'IDLE') && (
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
              {file && (
                <div className="w-full text-center relative group mb-6 animate-in zoom-in-50 duration-300">
                  <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3 inline-block relative pr-12 pl-4"> 
                    <p className="font-bold truncate max-w-[200px] text-[15px] text-emerald-100">{file.name}</p>
                    <p className="text-[11px] text-emerald-500/60 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    
                    <button 
                      onClick={handleReset}
                      className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 text-emerald-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                      title="Remove file"
                    >
                      <X size={16} /> 
                    </button>
                  </div>
                </div>
              )}

              {/* BOTTONI AZIONE */}
              {(status === 'IDLE' || status === 'READY') && (
                <div className={`mt-2 flex flex-col gap-3 z-10 transition-opacity duration-300 ${!file ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                  
                  {/* Local Save */}
                  <div className="flex gap-3">
                    <button
                      disabled={!file}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-900/20 border border-emerald-700/50 hover:bg-emerald-800/40 text-emerald-100 font-bold text-[14px] rounded transition-colors uppercase disabled:cursor-not-allowed"
                      onClick={() => startEncrypt('LOCAL_ONLY')}
                    >
                      <Computer size={16} /> Encrypt & Save Locally
                    </button>
                  </div>

                  {/* Share & Dropbox */}
                  <div className="flex flex-row gap-3"> 
                    <button
                      disabled={!file}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-[13px] rounded transition-colors uppercase tracking-wide px-2 disabled:cursor-not-allowed"
                      onClick={() => startEncrypt('UPLOAD')}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span className="flex items-center gap-1"><Lock size={14} /> Share Link</span>
                        <span className="text-[9px] opacity-70">(Max 50MB)</span>
                      </div>
                    </button>

                    {!dbxToken ? (
                      <button
                        disabled={!file} // Se vuoi che si possa connettere dropbox anche senza file, togli questo disabled
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0061FE] hover:bg-[#0057e3] text-white font-bold text-[13px] rounded transition-colors uppercase tracking-wide px-2 disabled:cursor-not-allowed"
                        onClick={handleDropboxAuth}
                      >
                        <Cloud size={14} /> Connect Dropbox
                      </button>
                    ) : (
                      <button
                        disabled={!file}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#0061FE] hover:bg-[#0057e3] text-white font-bold text-[13px] rounded transition-colors uppercase tracking-wide px-2 disabled:cursor-not-allowed"
                        onClick={() => startEncrypt('DROPBOX')}
                      >
                        <Cloud size={14} /> Save to Dropbox
                      </button>
                    )}
                  </div>
                </div>
              )}

              {encryptError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/50 p-3 rounded flex items-center gap-3 animate-in shake mt-6">
                  <AlertTriangle className="text-red-500 flex-shrink-0" size={16} />
                  <p className="text-[12px] text-red-200">{encryptError}</p>
                </div>
              )}

              {/* ADVANCED SETTINGS PANEL */}
              {(status === 'IDLE' || status === 'READY') && (
                <div className="max-w-md mx-auto mt-4 mb-4 relative z-20 space-y-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-[11px] text-emerald-500/70 hover:text-emerald-400 uppercase tracking-widest font-bold mx-auto transition-colors"
                > 
                  <Settings size={12} />
                  {showAdvanced ? 'Hide Options' : 'Advanced Options'}
                </button>

              {showAdvanced && (
                  <div 
                  ref={advancedSettingsRef} 
                  className="bg-black/40 border border-emerald-900/50 rounded-xl p-6 space-y-3 animate-in slide-in-from-top-2 fade-in duration-300 backdrop-blur-md shadow-2xl">
                      
                     {/* 1. CUSTOM PASSWORD / KEY */}
                      <div>
                        <label className="text-[12px] text-emerald-100 font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                          <Lock size={12} /> Encryption Key / Password
                        </label>
                        
                        {/* Checkbox per abilitare */}
                        <div 
                          className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded transition-colors mb-2"
                          onClick={() => {
                              setUsePassword(!usePassword);
                              if (!usePassword) setTimeout(() => document.getElementById('custom-pwd')?.focus(), 100);
                          }}
                        >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${usePassword ? 'bg-emerald-600 border-emerald-500' : 'border-emerald-700 bg-black/30 group-hover:border-emerald-500'}`}>
                              {usePassword && <CheckCircle2 size={10} className="text-white" />}
                            </div>
                            <span className="text-[12px] text-emerald-300/80 group-hover:text-emerald-200 transition-colors select-none">
                                Set Custom Password
                            </span>
                        </div>

                        {/* Campi input password (mostrati solo se abilitato) */}
                        {usePassword && (
                          <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
                              <div className="relative">
                                  <input
                                      id="custom-pwd"
                                      type={showPasswordText ? "text" : "password"}
                                      placeholder="Enter your password..."
                                      value={customPassword}
                                      onChange={(e) => setCustomPassword(e.target.value)}
                                      className="w-full bg-black/40 border border-emerald-800 rounded px-3 py-2 text-[13px] text-emerald-100 focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-800"
                                  />
                                  <button
                                      onClick={() => setShowPasswordText(!showPasswordText)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50 hover:text-emerald-300"
                                  >
                                      {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                              </div>
                              
                              <input
                                  type={showPasswordText ? "text" : "password"}
                                  placeholder="Confirm password..."
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                                  className={`w-full bg-black/40 border rounded px-3 py-2 text-[13px] text-emerald-100 outline-none transition-all placeholder:text-emerald-800 
                                  ${confirmPassword && customPassword !== confirmPassword 
                                      ? 'border-red-500/50 focus:border-red-500' // Bordo Rosso se diverse
                                      : 'border-emerald-800 focus:border-emerald-500' // Bordo Verde se ok
                                  }`}
                              />
                              <p className="text-[10px] text-emerald-500/40">
                                If disabled, a random secure key will be generated for you.
                              </p>
                          </div>
                        )}
                      </div>

                      {/* 1.5 RANDOM FILENAME */}
                      <div>
                        <label className="text-[12px] text-emerald-100 font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                          <Shuffle size={12} /> Privacy
                        </label>

                        <div
                          className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded transition-colors"
                          onClick={() => setUseRandomName(!useRandomName)}
                        >
                          <div
                            className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${useRandomName ? 'bg-emerald-600 border-emerald-500' : 'border-emerald-700 bg-black/30 group-hover:border-emerald-500'}`}
                          >
                            {useRandomName && <CheckCircle2 size={10} className="text-white" />}
                          </div>
                          <span className="text-[12px] text-emerald-300/80 group-hover:text-emerald-200 transition-colors select-none">
                            Use Random Filename (e.g. x8k29a.enc)
                          </span>
                        </div>
                      </div>

                      {/* 2. FILE OBSCURITY */}
                      <div>
                        <label className="text-[12px] text-emerald-100 font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                          <EyeOff size={12} /> Obscurity
                        </label>
                        
                        {/* Aggiunto onClick sul div contenitore e cursor-pointer */}
                        <div 
                          className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded transition-colors"
                          onClick={() => setHideExtension(!hideExtension)}
                        >
                          <div 
                            className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${hideExtension ? 'bg-emerald-600 border-emerald-500' : 'border-emerald-700 bg-black/30 group-hover:border-emerald-500'}`}
                          >
                            {hideExtension && <CheckCircle2 size={10} className="text-white" />}
                          </div>
                          <span className="text-[12px] text-emerald-300/80 group-hover:text-emerald-200 transition-colors select-none">
                            Hide file extension (save as .bin)
                          </span>
                        </div>
                      </div>

                      {/* 3. STEGANOGRAPHY (Placeholder) */}
                      <div className="opacity-50 pointer-events-none grayscale">
                         <label className="text-[12px] text-emerald-100 font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                          <Settings size={12} /> Steganography
                        </label>
                        <div className="text-[11px] text-emerald-500/40 border border-emerald-900/30 p-2 rounded bg-black/20">
                           [ COMING SOON ] Hide encrypted data inside images.
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* LOADING STATE */}
              {status === 'ENCRYPTING' && (
                <div className="mt-8 flex flex-col items-center justify-center text-emerald-300 animate-pulse z-10">
                  <Lock size={36} className="mb-3" />
                  <p className="text-[15px] tracking-widest">ENCRYPTING_DATA...</p>
                </div>
              )}


              {/* DONE STATE: LOCAL_ONLY & DROPBOX */}
              {status === 'DONE' && (currentMode === 'LOCAL_ONLY' || currentMode === 'DROPBOX') && (
                <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300 z-10">
                  <div className="flex items-center gap-2 text-emerald-300 bg-emerald-900/20 p-3 rounded border border-emerald-800/50">
                    <CheckCircle2 size={20} />
                    <p className="font-bold tracking-wide text-[14px]">ENCRYPTION SUCCESSFUL!</p>
                  </div>
                  <p className="text-[13px] text-emerald-400/70 mb-4">Download started automatically.</p>
                  
                  <div className="flex justify-center w-full my-5">
                      <button
                        onClick={() => downloadUrl && triggerDownload(downloadUrl, `${file?.name || 'file'}.enc`)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 text-emerald-100 rounded text-[13px] transition-colors font-bold uppercase shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      >
                        DOWNLOAD AGAIN
                      </button>
                  </div>

                  {/* KEY / PASSWORD DISPLAY */}
                  {keyString && (
                    <div className="mt-4 text-left">
                      <p className="text-[12px] text-emerald-400/80 mb-1 uppercase tracking-wider font-bold flex items-center gap-2">
                        &gt; {usePassword ? 'Decryption Password' : 'Decryption Key'} <AlertTriangle size={12} className="text-yellow-500" />
                      </p>
                      <div className="flex gap-2 relative">
                        <input 
                          readOnly 
                          type={usePassword && showPasswordText === false ? "password" : "text"} // Nasconde SOLO se è password E non si vuole vedere
                          value={keyString} 
                          className="flex-1 bg-black/30 border border-emerald-800 rounded px-2 py-1 text-[12px] text-emerald-200 font-mono outline-none pr-8"
                        />
                        
                        {/* Toggle Visibility Button - SOLO per password */}
                        {usePassword && (
                          <button
                            onClick={() => setShowPasswordText(!showPasswordText)}
                            className="absolute right-[80px] top-1/2 -translate-y-1/2 text-emerald-500/50 hover:text-emerald-300 px-2"
                          >
                            {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}

                        <button
                          onClick={copyKey}
                          className="px-3 py-2 bg-emerald-600/20 border border-emerald-600/50 hover:bg-emerald-500 hover:text-black text-emerald-300 rounded transition-all font-bold uppercase text-[12px] min-w-[70px] flex items-center justify-center gap-1"
                        >
                          {keyCopied ? 'COPIED!' : <><Copy size={12}/> COPY</>}
                        </button>
                      </div>
                      
                      <p className="text-[11px] text-emerald-500/50 mt-1 font-bold">
                        !! SAVE THIS {usePassword ? 'PASSWORD' : 'KEY'}. NO RECOVERY POSSIBLE. !!
                      </p>
                    </div>
                  )}
                  
                  <button
                    className="block w-full mt-4 text-[11px] text-emerald-500/50 hover:text-emerald-300 uppercase tracking-widest"
                    onClick={resetEncrypt}
                  >
                    [ START NEW SESSION]
                  </button>
                </div>
              )}

              {/* DONE STATE: UPLOAD (SOLO LINK) */}
              {status === 'DONE' && currentMode === 'UPLOAD' && (
                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 z-10">
                  <div className="flex items-center gap-2 text-emerald-300 bg-emerald-900/20 p-3 rounded border border-emerald-800/50">
                    <CheckCircle2 size={20} />
                    <span className="font-bold tracking-wide text-[14px]">ENCRYPTION SUCCESSFUL</span>
                  </div>
                  
                  {/* SHARE LINK SECTION - NO KEY/PASSWORD SHOWN */}
                  {shareLink && (
                    <div>
                      <p className="text-[12px] text-emerald-400/80 mb-1 uppercase tracking-wider font-bold flex items-center gap-2">
                        &gt; Share Link <AlertTriangle size={12} className="text-yellow-500" />
                      </p>
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
                      <p className="text-[11px] text-emerald-500/50 mt-1 font-bold">
                        !! SHARE THIS LINK. NO RECOVERY POSSIBLE. !!
                      </p>
                      
                      {/* Nota per l'utente se ha usato password custom */}
                      {usePassword && (
                        <p className="text-[11px] text-yellow-500/70 mt-2 italic">
                          * Remember: recipient will need the custom password you set.
                        </p>
                      )}
                    </div>
                  )}
                  
                  <button
                    className="block w-full mt-4 text-[11px] text-emerald-500/50 hover:text-emerald-300 uppercase tracking-widest"
                    onClick={resetEncrypt}
                  >
                    [ START NEW SESSION]
                  </button>
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
                <p className="text-emerald-300/90">&gt; input: .enc file here</p>
                <p className="text-emerald-300/90">&gt; output: original file</p>
              </div>
              <div className="h-px bg-emerald-900/30 mb-6 relative z-10" />

              {/* DROP AREA DECRYPT */}
              <div>
                {!encryptedFile && (
                  <div
                    className={`
                      relative flex flex-col items-center justify-center px-4 py-10
                      border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer mb-6
                      ${isHoverDecrypt
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : 'border-emerald-800/60 bg-black/20 hover:border-emerald-500/50 hover:bg-black/40'}
                      ${decryptedUrl ? 'hidden' : 'flex'} 
                    `}
                    onDragOver={(e) => { e.preventDefault(); setIsHoverDecrypt(true); }}
                    onDragLeave={() => setIsHoverDecrypt(false)}
                    onDrop={handleDropDecrypt}
                  >
                    <Upload className={`mb-3 ${isHoverDecrypt ? 'text-emerald-300' : 'text-emerald-500/70'}`} size={32} />
                    <p className="text-[16px] font-bold text-emerald-100">DROP .ENC FILE</p>
                    <p className="text-emerald-400/60 text-[13px] mt-2">[ or click to browse ]</p>
                    
                    <input 
                        type="file" 
                        accept=".enc" // Puoi decommentare se vuoi forzare l'estensione nel dialog
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleBrowseDecrypt} 
                    />
                  </div>
                )}
              </div>

              {/* 2. FILE INFO (Visibile SOLO se c'è file) */}
              {encryptedFile && (
                <div className="w-full text-center relative group mb-6 animate-in zoom-in-50 duration-300">
                  <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3 inline-block relative pr-12 pl-4">
                    <p className="font-bold truncate max-w-[200px] text-[15px] text-emerald-100">{encryptedFile.name}</p>
                    <p className="text-[11px] text-emerald-500/60 mt-0.5">{(encryptedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    
                    {/* Tasto X per rimuovere */}
                    <button 
                      onClick={() => {
                        setEncryptedFile(null);
                        setDecryptedUrl(null);
                        setDecryptKey('');
                        // Se vuoi resettare anche errori o altro aggiungilo qui
                      }}
                      className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 text-emerald-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                      title="Remove file"
                    >
                      <X size={16} /> 
                    </button>
                  </div>
                </div>
              )}

              {/* DECRYPT KEY INPUT */}
              <div className="mb-4">
                  <p className="text-[12px] text-emerald-400/80 mb-2 uppercase tracking-wider font-bold">
                      Enter Decryption Key / Password
                  </p>
                  <div className="relative">
                      <input
                          type={showPasswordText ? "text" : "password"} // Riutilizziamo lo stesso stato showPasswordText o ne crei uno nuovo locale
                          value={decryptKey}
                          onChange={(e) => setDecryptKey(e.target.value)}
                          placeholder="Paste the key or enter password here..."
                          className="w-full bg-black/40 border border-emerald-800 rounded pl-3 pr-10 py-3 text-[13px] text-emerald-100 focus:border-emerald-500 outline-none transition-all font-mono shadow-inner"
                      />
                      {/* Toggle Visibility */}
                      <button
                          onClick={() => setShowPasswordText(!showPasswordText)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50 hover:text-emerald-300"
                      >
                          {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                  </div>
                  {/* ACTION BUTTON: DECRYPT */}
                    <button
                      disabled={!encryptedFile || !decryptKey}
                      onClick={handleDecrypt}
                      className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/20 disabled:text-emerald-500/30 disabled:cursor-not-allowed text-black font-bold text-[14px] rounded transition-all uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20"
                    >
                      {status === 'ENCRYPTING' ? ( /* Ricicliamo lo stato ENCRYPTING anche per decriptare se non ne hai uno specifico */
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          <Lock size={16} className="text-black" /> DECRYPT FILE
                        </>
                      )}
                    </button>

                    {/* ERROR MESSAGE */}
                    {decryptError && (
                      <div className="mt-4 bg-red-500/10 border border-red-500/50 p-3 rounded flex items-center gap-3 animate-in shake">
                        <AlertTriangle className="text-red-500 flex-shrink-0" size={16} />
                        <p className="text-[12px] text-red-200">{decryptError}</p>
                      </div>
                    )}

                    {/* SUCCESS STATE: DECRYPTED */}
                    {decryptedUrl && (
                      <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300 z-10">
                        <div className="flex items-center gap-2 text-emerald-300 bg-emerald-900/20 p-3 rounded border border-emerald-800/50">
                          <CheckCircle2 size={20} />
                          <p className="font-bold tracking-wide text-[14px]">DECRYPTION SUCCESSFUL!</p>
                        </div>
                        <p className="text-[13px] text-emerald-400/70 mb-4 mt-2">File restored successfully.</p>
                        
                        <div className="flex justify-center w-full my-4">
                            <button
                              onClick={() => triggerDownload(decryptedUrl, decryptedFileName)}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 text-emerald-100 rounded text-[13px] transition-colors font-bold uppercase shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                            >
                              DOWNLOAD AGAIN
                            </button>
                        </div>

                        <button
                          className="block w-full mt-2 text-[11px] text-emerald-500/50 hover:text-emerald-300 uppercase tracking-widest"
                          onClick={() => {
                            setEncryptedFile(null);
                            setDecryptedUrl(null);
                            setDecryptKey('');
                            setDecryptError(null);
                          }}
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
             // UPLOAD LIMIT: {MAX_UPLOAD_MB}MB (Online) / UNLIMITED (Local & Dropbox) <br/>
             // WARNING: LARGE FILES (&gt;1GB) MAY REQUIRE SIGNIFICANT RAM
           </p>
        </footer>

      </div>
    </div>
  );
}

export default App;
