// App.tsx
// Main application component for void.sh — in-browser file encryption.
// Provides two panels: Encrypt (left) and Decrypt (right).

import React, { useState, useRef, useEffect } from 'react';
import { Lock, Upload, CheckCircle2, Copy, AlertTriangle, Settings, Eye, EyeOff, X, Shuffle } from 'lucide-react';
import { encryptFile, decryptFile } from './crypto';
import CONFIG from './config';
import Toast from './components/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'IDLE' | 'READY' | 'ENCRYPTING' | 'DONE';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Detects iOS devices that require a different download strategy. */
const isIOSLike = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const maxTouchPoints = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints || 0;
  return (
    /iP(hone|od|ad)/.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1) ||
    (platform === 'iPad' && maxTouchPoints > 1)
  );
};

/** Triggers a file download. On iOS, opens the blob URL in a new tab instead. */
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

/** Removes unsafe characters and normalizes a filename for cross-platform compatibility. */
const sanitizeFilename = (name: string): string => {
  let base = name.split(/[\\/]/).pop() || 'file';
  base = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  base = base.split('').filter(char => {
    const code = char.charCodeAt(0);
    return (code >= 32 && code !== 34 && code !== 60 && code !== 62 &&
            code !== 124 && code !== 127);
  }).join('');
  base = base.replace(/[_\s]+/g, '_').replace(/^_|_$/g, '');
  const maxLength = 200;
  if (base.length > maxLength) {
    const ext = base.split('.').pop() || '';
    base = base.substring(0, maxLength - ext.length - 1) + '.' + ext;
  }
  return base || 'file.bin';
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function App() {
  // --- Responsive scaling ---
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.33);

  useEffect(() => {
    const updateScale = () => {
      if (!wrapperRef.current) return;
      const naturalWidth = wrapperRef.current.scrollWidth;
      const naturalHeight = wrapperRef.current.scrollHeight;
      const scaleX = window.innerWidth / naturalWidth;
      const scaleY = window.innerHeight / naturalHeight;
      setScale(Math.min(1.33, scaleX, scaleY));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // --- Encrypt panel state ---
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('IDLE');
  const [keyCopied, setKeyCopied] = useState(false);
  const [isHoverEncrypt, setIsHoverEncrypt] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadUrlRef, setDownloadUrlRef] = useState<string | null>(null);
  const [keyString, setKeyString] = useState<string | null>(null);
  const [encryptError, setEncryptError] = useState<string | null>(null);
  const [encryptProgress, setEncryptProgress] = useState(0);

  // --- Decrypt panel state ---
  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [decryptKey, setDecryptKey] = useState<string>('');
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [decryptedFileName, setDecryptedFileName] = useState<string>('decrypted');
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isHoverDecrypt, setIsHoverDecrypt] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  // --- Advanced settings state ---
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [customPassword, setCustomPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [hideExtension, setHideExtension] = useState(false);
  const [useRandomName, setUseRandomName] = useState(false);

  // --- Toast notifications ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // --- Helper: revoke object URLs to prevent memory leaks ---
  const revokeUrl = (url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  };

  // =========================================================================
  // Encrypt handlers
  // =========================================================================

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

  /** Validates file size and sanitizes the name before setting it. */
  const validateAndSetFile = (f: File) => {
    if (f.size > CONFIG.HARD_MAX_BYTES) {
      setEncryptError(`File too large (maximum ${CONFIG.HARD_MAX_MB} MB).`);
      return;
    }
    const safeName = sanitizeFilename(f.name);
    const safeFile = new File([f], safeName, { type: f.type });
    setFile(safeFile);
    setStatus('READY');
    revokeUrl(downloadUrl);
    setDownloadUrl(null);
    setKeyString(null);
    setEncryptError(null);
  };

  /** Runs the encryption process and triggers the download. */
  const startEncrypt = async () => {
    if (!file) return;

    if (usePassword) {
      if (!customPassword) {
        setEncryptError('Please enter a custom password.');
        return;
      }
      if (customPassword !== confirmPassword) {
        setEncryptError('Passwords do not match.');
        return;
      }
    }

    try {
      setStatus('ENCRYPTING');
      setEncryptError(null);
      setKeyCopied(false);
      revokeUrl(downloadUrl);

      const passwordToUse = usePassword ? customPassword : undefined;
      const { encryptedBlob, keyString: usedKey } = await encryptFile(file, passwordToUse, setEncryptProgress);

      setKeyString(usedKey);
      setShowPasswordText(false);

      const localUrl = URL.createObjectURL(encryptedBlob);
      setDownloadUrl(localUrl);
      setDownloadUrlRef(localUrl);

      // Determine the output filename
      let finalBaseName = file.name;

      if (useRandomName) {
        const randomString = Math.random().toString(36).substring(2, 10);
        const ext = file.name.split('.').pop();
        finalBaseName = `${randomString}.${ext}`;
      }

      if (hideExtension) {
        const lastDotIndex = finalBaseName.lastIndexOf('.');
        if (lastDotIndex !== -1) {
          finalBaseName = finalBaseName.substring(0, lastDotIndex) + '.bin';
        } else {
          finalBaseName = finalBaseName + '.bin';
        }
      }

      const finalFileName = `${finalBaseName}.enc`;
      triggerDownload(localUrl, finalFileName);
      setStatus('DONE');
      setShowAdvanced(false);
    } catch (err: unknown) {
      console.error(err);
      setEncryptError(err instanceof Error ? err.message : 'Encryption failed');
      setStatus('IDLE');
    }
  };

  /** Copies the decryption key to the clipboard. */
  const copyKey = () => {
    if (!keyString) return;
    navigator.clipboard.writeText(keyString);
    setKeyCopied(true);
    setToast({ message: 'Key copied to clipboard!', type: 'success' });
    setTimeout(() => setKeyCopied(false), 1200);
  };

  /** Resets the encrypt panel to its initial state. */
  const resetEncrypt = () => {
    revokeUrl(downloadUrl);
    setFile(null);
    setStatus('IDLE');
    setKeyCopied(false);
    setIsHoverEncrypt(false);
    setDownloadUrl(null);
    setDownloadUrlRef(null);
    setKeyString(null);
    setEncryptError(null);
    setEncryptProgress(0);
    setUsePassword(false);
    setCustomPassword('');
    setConfirmPassword('');
    setHideExtension(false);
    setUseRandomName(false);
    setShowAdvanced(false);
  };

  // =========================================================================
  // Decrypt handlers
  // =========================================================================

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
      revokeUrl(decryptedUrl);
      setEncryptedFile(null);
      setDecryptKey('');
      setDecryptedUrl(null);
      setDecryptedFileName('decrypted');
      setDecryptError(null);
      setIsHoverDecrypt(false);
      return;
    }
    validateAndSetEncryptedFile(f);
  };

  /** Validates and sets the encrypted file for decryption. */
  const validateAndSetEncryptedFile = (f: File) => {
    if (f.size > CONFIG.HARD_MAX_BYTES) {
      setDecryptError(`File too large (maximum ${CONFIG.HARD_MAX_MB} MB).`);
      return;
    }
    revokeUrl(decryptedUrl);
    setEncryptedFile(f);
    setDecryptedUrl(null);
    setDecryptError(null);

    // Extract the original filename by stripping .enc suffix
    let baseName = f.name;
    if (baseName.toLowerCase().endsWith('.enc')) {
      baseName = baseName.slice(0, -4);
    }
    // Remove trailing " (1)", " (2)", etc. from duplicate downloads
    baseName = baseName.replace(/\s\(\d+\)$/, '');
    setDecryptedFileName(baseName || 'decrypted');
  };

  /** Runs the decryption process and triggers the download. */
  const handleDecrypt = async () => {
    if (!encryptedFile || !decryptKey) return;

    try {
      setDecryptError(null);
      setDecryptedUrl(null);
      setDecrypting(true);

      const decryptedBlob = await decryptFile(encryptedFile, decryptKey);
      revokeUrl(decryptedUrl);
      const url = URL.createObjectURL(decryptedBlob);

      const originalName = encryptedFile.name.replace(/\.enc$/i, '');
      setDecryptedFileName(originalName);
      setDecryptedUrl(url);

      triggerDownload(url, originalName);
    } catch (e) {
      console.error(e);
      setDecryptError('Decryption failed. Invalid key or file.');
    } finally {
      setDecrypting(false);
    }
  };

  /** Resets the entire application to its initial state. */
  const handleReset = () => {
    revokeUrl(downloadUrl);
    revokeUrl(decryptedUrl);
    setFile(null);
    setEncryptedFile(null);
    setStatus('IDLE');
    setDownloadUrl(null);
    setDownloadUrlRef(null);
    setKeyString(null);
    setDecryptKey('');
    setDecryptedUrl(null);
    setDecryptError(null);
    setUsePassword(false);
    setCustomPassword('');
    setConfirmPassword('');
    setHideExtension(false);
    setShowAdvanced(false);
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="min-h-screen bg-[#050b10] text-[15px] text-emerald-100 flex items-center justify-center font-mono overflow-auto">
      <div className="w-full max-w-6xl px-6 py-6" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }} ref={wrapperRef}>

        {/* Header */}
        <header className="mb-6">
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="inline-block px-2 py-0.5 border border-emerald-700 text-[15px] tracking-[0.15em] uppercase font bg-emerald-900/10">
                  void.sh
                </span>
              </div>
              <p className="text-[14px] text-emerald-300/90 font-light tracking-tight mt-1">
                &gt; In-Browser Encryption. Zero Knowledge.
              </p>
            </div>
          </div>
          <div className="h-px bg-emerald-900/50 mt-4" />
        </header>

        {/* Main content: Encrypt + Decrypt panels */}
        <main className="flex flex-col lg:flex-row gap-6">

          {/* ---- ENCRYPT PANEL ---- */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <div className="bg-[#0a1219] border border-emerald-900/40 rounded-xl p-6 h-full flex flex-col shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 to-transparent pointer-events-none" />

              {/* Panel title */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[14px] text-emerald-400 tracking-widest font-bold">:: ENCRYPT ::</span>
              </div>

              {/* Algorithm info */}
              <div className="text-[12px] space-y-1 mb-4 opacity-70 relative z-10">
                <p className="text-emerald-300/90">&gt; algo: AES-256-GCM</p>
                <p className="text-emerald-300/90">&gt; key: generated locally</p>
              </div>
              <div className="h-px bg-emerald-900/30 mb-6 relative z-10" />

              {/* Drop zone — shown when no file is selected */}
              {status === 'IDLE' && (
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

              {/* Selected file badge with remove button */}
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

              {/* Encrypt action button */}
              {(status === 'IDLE' || status === 'READY') && (
                <div className={`mt-2 flex flex-col gap-3 z-10 transition-opacity duration-300 ${!file ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                  <button
                    disabled={!file}
                    className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/30 text-white font-bold text-[14px] rounded transition-colors uppercase disabled:cursor-not-allowed"
                    onClick={() => startEncrypt()}
                  >
                    <Lock size={16} /> Encrypt &amp; Download
                  </button>
                </div>
              )}

              {/* Error message */}
              {encryptError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/50 p-3 rounded flex items-center gap-3 animate-in shake mt-6">
                  <AlertTriangle className="text-red-500 flex-shrink-0" size={16} />
                  <p className="text-[12px] text-red-200">{encryptError}</p>
                </div>
              )}

              {/* Advanced settings toggle and panel */}
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
                    <div className="bg-black/40 border border-emerald-900/50 rounded-xl p-6 space-y-3 animate-in slide-in-from-top-2 fade-in duration-300 backdrop-blur-md shadow-2xl">

                      {/* Custom password section */}
                      <div>
                        <label className="text-[12px] text-emerald-100 font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                          <Lock size={12} /> Custom Password
                        </label>

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
                            Use custom password instead of random key
                          </span>
                        </div>

                        {usePassword && (
                          <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
                            <div className="relative">
                              <input
                                id="custom-pwd"
                                type={showPasswordText ? 'text' : 'password'}
                                placeholder="Enter your password..."
                                value={customPassword}
                                onChange={(e) => setCustomPassword(e.target.value)}
                                className="w-full bg-black/40 border border-emerald-800 rounded px-3 py-2 text-[13px] text-emerald-100 focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-800"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswordText(!showPasswordText)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50 hover:text-emerald-300"
                              >
                                {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>

                            <input
                              type={showPasswordText ? 'text' : 'password'}
                              placeholder="Confirm password..."
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={`w-full bg-black/40 border rounded px-3 py-2 text-[13px] text-emerald-100 outline-none transition-all placeholder:text-emerald-800
                                ${confirmPassword && customPassword !== confirmPassword
                                  ? 'border-red-500/50 focus:border-red-500'
                                  : 'border-emerald-800 focus:border-emerald-500'
                                }`}
                            />
                            <p className="text-[10px] text-emerald-500/40">
                              If disabled, a random secure key will be generated.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Random filename option */}
                      <div>
                        <label className="text-[12px] text-emerald-100 font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                          <Shuffle size={12} /> Privacy
                        </label>

                        <div
                          className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded transition-colors"
                          onClick={() => setUseRandomName(!useRandomName)}
                        >
                          <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${useRandomName ? 'bg-emerald-600 border-emerald-500' : 'border-emerald-700 bg-black/30 group-hover:border-emerald-500'}`}>
                            {useRandomName && <CheckCircle2 size={10} className="text-white" />}
                          </div>
                          <span className="text-[12px] text-emerald-300/80 group-hover:text-emerald-200 transition-colors select-none">
                            Random filename (e.g. x8k29a.enc)
                          </span>
                        </div>
                      </div>

                      {/* Hide extension option */}
                      <div>
                        <label className="text-[12px] text-emerald-100 font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                          <EyeOff size={12} /> Obscurity
                        </label>

                        <div
                          className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded transition-colors"
                          onClick={() => setHideExtension(!hideExtension)}
                        >
                          <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${hideExtension ? 'bg-emerald-600 border-emerald-500' : 'border-emerald-700 bg-black/30 group-hover:border-emerald-500'}`}>
                            {hideExtension && <CheckCircle2 size={10} className="text-white" />}
                          </div>
                          <span className="text-[12px] text-emerald-300/80 group-hover:text-emerald-200 transition-colors select-none">
                            Save as .bin instead of .enc
                          </span>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Encryption in progress */}
              {status === 'ENCRYPTING' && (
                <div className="mt-8 flex flex-col items-center justify-center text-emerald-300 z-10">
                  <Lock size={36} className="mb-4 animate-pulse" />
                  <p className="text-[15px] tracking-widest mb-4">ENCRYPTING...</p>
                  <div className="w-full max-w-xs">
                    <div className="h-2 bg-emerald-900/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                        style={{ width: `${encryptProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-emerald-400/70 mt-2 text-center">
                      {encryptProgress}%
                    </p>
                  </div>
                </div>
              )}

              {/* Encryption complete */}
              {status === 'DONE' && (
                <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300 z-10">
                  <div className="flex items-center gap-2 text-emerald-300 bg-emerald-900/20 p-3 rounded border border-emerald-800/50">
                    <CheckCircle2 size={20} />
                    <p className="font-bold tracking-wide text-[14px]">ENCRYPTION SUCCESSFUL!</p>
                  </div>
                  <p className="text-[13px] text-emerald-400/70 mb-4">Download started automatically.</p>

                  <div className="flex justify-center w-full my-5">
                    <button
                      onClick={() => downloadUrlRef && triggerDownload(downloadUrlRef, `${file?.name || 'file'}.enc`)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 text-emerald-100 rounded text-[13px] transition-colors font-bold uppercase shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    >
                      DOWNLOAD AGAIN
                    </button>
                  </div>

                  {/* Display key/password for the user to save */}
                  {keyString && (
                    <div className="mt-4 text-left">
                      <p className="text-[12px] text-emerald-400/80 mb-1 uppercase tracking-wider font-bold flex items-center gap-2">
                        &gt; {usePassword ? 'Decryption Password' : 'Decryption Key'} <AlertTriangle size={12} className="text-yellow-500" />
                      </p>
                      <div className="flex gap-2 relative">
                        <input
                          readOnly
                          type={usePassword && !showPasswordText ? 'password' : 'text'}
                          value={keyString}
                          className="flex-1 bg-black/30 border border-emerald-800 rounded px-2 py-1 text-[12px] text-emerald-200 font-mono outline-none pr-8"
                        />

                        {usePassword && (
                          <button
                            type="button"
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
                          {keyCopied ? 'COPIED!' : <><Copy size={12} /> COPY</>}
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
                    [ START NEW SESSION ]
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ---- DECRYPT PANEL ---- */}
          <div className="w-full lg:w-1/2 flex flex-col">
            <div className="bg-[#0a1219] border border-emerald-900/40 rounded-xl p-6 h-full flex flex-col shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 to-transparent pointer-events-none" />

              {/* Panel title */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[14px] text-emerald-400 tracking-widest font-bold">:: DECRYPT ::</span>
              </div>

              {/* Instructions */}
              <div className="text-[12px] space-y-1 mb-4 opacity-70 relative z-10">
                <p className="text-emerald-300/90">&gt; input: .enc file here</p>
                <p className="text-emerald-300/90">&gt; output: original file</p>
              </div>
              <div className="h-px bg-emerald-900/30 mb-6 relative z-10" />

              {/* Drop zone for encrypted files */}
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
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleBrowseDecrypt}
                  />
                </div>
              )}

              {/* Selected encrypted file badge */}
              {encryptedFile && (
                <div className="w-full text-center relative group mb-6 animate-in zoom-in-50 duration-300">
                  <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3 inline-block relative pr-12 pl-4">
                    <p className="font-bold truncate max-w-[200px] text-[15px] text-emerald-100">{encryptedFile.name}</p>
                    <p className="text-[11px] text-emerald-500/60 mt-0.5">{(encryptedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button
                      onClick={() => {
                        revokeUrl(decryptedUrl);
                        setEncryptedFile(null);
                        setDecryptedUrl(null);
                        setDecryptKey('');
                        setDecryptError(null);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 text-emerald-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Key/password input and decrypt button */}
              <div className="mb-4">
                <p className="text-[12px] text-emerald-400/80 mb-2 uppercase tracking-wider font-bold">
                  Enter Decryption Key / Password
                </p>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={decryptKey}
                    onChange={(e) => setDecryptKey(e.target.value)}
                    placeholder="Paste the key or enter password..."
                    className="w-full bg-black/40 border border-emerald-800 rounded pl-3 pr-10 py-3 text-[13px] text-emerald-100 focus:border-emerald-500 outline-none transition-all font-mono shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50 hover:text-emerald-300"
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button
                  disabled={!encryptedFile || !decryptKey}
                  onClick={handleDecrypt}
                  className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/20 disabled:text-emerald-500/30 disabled:cursor-not-allowed text-black font-bold text-[14px] rounded transition-all uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20"
                >
                  {decrypting ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock size={16} className="text-black" /> DECRYPT FILE
                    </>
                  )}
                </button>

                {/* Decrypt error */}
                {decryptError && (
                  <div className="mt-4 bg-red-500/10 border border-red-500/50 p-3 rounded flex items-center gap-3 animate-in shake">
                    <AlertTriangle className="text-red-500 flex-shrink-0" size={16} />
                    <p className="text-[12px] text-red-200">{decryptError}</p>
                  </div>
                )}

                {/* Decryption complete */}
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
                        revokeUrl(decryptedUrl);
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

        {/* Footer */}
        <footer className="mt-8 text-center opacity-60">
          <p className="text-[12px] text-emerald-500/60 max-w-3xl mx-auto leading-relaxed font-light">
            // ZERO SERVER: FILES NEVER LEAVE YOUR BROWSER <br />
            // AES-256-GCM ENCRYPTION IN YOUR BROWSER <br />
            // SHARE .ENC FILES + KEY SEPARATELY FOR MAXIMUM SECURITY
          </p>
        </footer>

        {/* Toast notifications */}
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      </div>
    </div>
  );
}

export default App;
