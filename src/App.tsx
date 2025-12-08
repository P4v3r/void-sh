import React, { useState } from 'react';
import { Lock, Upload, CheckCircle2 } from 'lucide-react';
import { encryptFile, decryptFile } from './crypto';
import { createClient } from '@supabase/supabase-js';

type Status = 'IDLE' | 'READY' | 'ENCRYPTING' | 'DONE';
type Mode = 'LOCAL_ONLY' | 'UPLOAD';

// Limite SOLO per modalità con upload (100 MB qui, puoi modificarlo)
const MAX_UPLOAD_MB = 100;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Limite di sicurezza assoluto per qualsiasi operazione in browser (es. 2 GB)
const HARD_MAX_MB = 2048;
const HARD_MAX_BYTES = HARD_MAX_MB * 1024 * 1024;

// client Supabase hardcoded (anon key è pubblica)
const supabaseUrl = 'https://rsnjdhkrgtuepivllvux.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbmpkaGtyZ3R1ZXBpdmxsdnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODExNTEsImV4cCI6MjA4MDc1NzE1MX0.WKxJB0TMJw3_zBvQsI3vpQxWbrT824OzdHtefgnNvPo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const triggerDownload = (url: string, filename: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

//const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('IDLE');
  const [copied, setCopied] = useState(false);
  const [isHoverEncrypt, setIsHoverEncrypt] = useState(false);

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [keyString, setKeyString] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [encryptError, setEncryptError] = useState<string | null>(null);

  // stati per DECRYPT locale
  const [encryptedFile, setEncryptedFile] = useState<File | null>(null);
  const [decryptKey, setDecryptKey] = useState<string>('');
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [decryptedFileName, setDecryptedFileName] = useState<string>('decrypted');
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isHoverDecrypt, setIsHoverDecrypt] = useState(false);

  // ---- ENCRYPT HANDLERS ----

  const handleDropEncrypt = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoverEncrypt(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;

    if (f.size > HARD_MAX_BYTES) {
      setEncryptError(
        `This file is larger than ${HARD_MAX_MB} MB. Very large files can freeze the browser. Please use something smaller (recommended max 1–2 GB).`,
      );
      return;
    }

    setFile(f);
    setStatus('READY');
    setDownloadUrl(null);
    setKeyString(null);
    setShareLink(null);
    setEncryptError(null);
  };

  const handleBrowseEncrypt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    if (f.size > HARD_MAX_BYTES) {
      setEncryptError(
        `This file is larger than ${HARD_MAX_MB} MB. Very large files can freeze the browser. Please use something smaller (recommended max 1–2 GB).`,
      );
      return;
    }

    setFile(f);
    setStatus('READY');
    setDownloadUrl(null);
    setKeyString(null);
    setShareLink(null);
    setEncryptError(null);
  };

  const startEncrypt = async (mode: Mode) => {
    if (!file) return;

    // guardia extra (nel caso lo stato sia stato impostato altrove)
    if (file.size > HARD_MAX_BYTES) {
      setEncryptError(
        `This file is larger than ${HARD_MAX_MB} MB. Very large files can freeze the browser. Please use something smaller (recommended max 1–2 GB).`,
      );
      setStatus('READY');
      return;
    }

    if (mode === 'UPLOAD' && file.size > MAX_UPLOAD_BYTES) {
      setEncryptError(
        `Online sharing supports files up to ${MAX_UPLOAD_MB} MB. Use "Encrypt only (no upload)" for larger files.`,
      );
      setStatus('READY');
      return;
    }

    try {
      setStatus('ENCRYPTING');
      setEncryptError(null);
      setCopied(false);

      const { encryptedBlob, keyString } = await encryptFile(file);
      setKeyString(keyString);

      const localUrl = URL.createObjectURL(encryptedBlob);
      setDownloadUrl(localUrl);

      if (mode === 'LOCAL_ONLY') {
        setShareLink(null);
        setStatus('DONE');
        return;
      }

      const objectPath = `files/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('vault-files')
        .upload(objectPath, encryptedBlob, {
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        setEncryptError('Upload failed. Encrypted file was not stored on the server.');
        setStatus('READY');
        return;
      }

      const origin = window.location.origin;
      const link = `${origin}/d/${encodeURIComponent(objectPath)}#${encodeURIComponent(
        keyString,
      )}`;

      setShareLink(link);
      setStatus('DONE');
    } catch (err) {
      console.error(err);
      setEncryptError('Encryption failed. Please try with a different file.');
      setStatus('READY');
    }
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // ---- RESET COMPLETO ----

  const reset = () => {
    setFile(null);
    setStatus('IDLE');
    setCopied(false);
    setIsHoverEncrypt(false);
    setDownloadUrl(null);
    setKeyString(null);
    setShareLink(null);
    setEncryptError(null);

    resetDecrypt();
  };

  // ---- RESET SOLO DECRYPT ----

  const resetDecrypt = () => {
    setEncryptedFile(null);
    setDecryptKey('');
    setDecryptedUrl(null);
    setDecryptedFileName('decrypted');
    setDecryptError(null);
    setIsHoverDecrypt(false);
  };

  // ---- DECRYPT HANDLERS ----

  const handleDropDecrypt = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHoverDecrypt(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;

    if (f.size > HARD_MAX_BYTES) {
      setDecryptError(
        `This encrypted file is larger than ${HARD_MAX_MB} MB. Decrypting very large files in the browser can exhaust memory and freeze the page. Use something smaller (recommended max 1–2 GB).`,
      );
      return;
    }

    setEncryptedFile(f);
    setDecryptedUrl(null);
    setDecryptError(null);

    let baseName = f.name;
    if (baseName.toLowerCase().endsWith('.enc')) {
      baseName = baseName.slice(0, -4); // togli .enc
    }
    baseName = baseName.replace(/\s\(\d+\)$/, ''); // togli " (1)" finale
    setDecryptedFileName(baseName || 'decrypted');
  };

  const handleBrowseDecrypt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (!f) {
      resetDecrypt();
      return;
    }

    if (f.size > HARD_MAX_BYTES) {
      setDecryptError(
        `This encrypted file is larger than ${HARD_MAX_MB} MB. Decrypting very large files in the browser can exhaust memory and freeze the page. Use something smaller (recommended max 1–2 GB).`,
      );
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

    if (encryptedFile.size > HARD_MAX_BYTES) {
      setDecryptError(
        `This encrypted file is larger than ${HARD_MAX_MB} MB. Decrypting very large files in the browser can exhaust memory and freeze the page. Use something smaller (recommended max 1–2 GB).`,
      );
      return;
    }

    try {
      setDecryptError(null);
      setDecryptedUrl(null);

      const decryptedBlob = await decryptFile(encryptedFile, decryptKey);
      const url = URL.createObjectURL(decryptedBlob);
      setDecryptedUrl(url);
    } catch (e) {
      console.error(e);
      setDecryptError('Decryption failed. Check the key and the encrypted file.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050b10] text-[15px] text-emerald-100 flex items-center justify-center">
      <div className="w-full max-w-5xl px-4 py-4">
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
              <div className="space-y-0.5 mt-1">
                <p className="text-[13px] text-emerald-300/80">
                  No accounts, no tracking, no server-side decryption or key recovery. 
                </p>
                <p className="text-[13px] text-emerald-300/80">
                  Processing: happens locally in your browser.
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
        <main className="mt-5 mb-2 flex flex-col lg:flex-row gap-6">
          {/* PANNELLO ENCRYPT */}
          <div className="w-full lg:w-1/2">
            <div className="panel rounded-xl p-5 h-full min-h-[420px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-emerald-300 font-mono">[ ENCRYPT AREA ]</span>
                <span className="text-[12px] text-emerald-500 font-mono">
                  {status === 'IDLE' && 'STATE: IDLE'}
                  {status === 'READY' && 'STATE: READY'}
                  {status === 'ENCRYPTING' && 'STATE: WORKING'}
                  {status === 'DONE' && 'STATE: DONE'}
                </span>
              </div>

              <p className="console-line text-emerald-300/85 mb-1 text-[13px]">
                &gt; encrypt files in your browser and share them with a private link
              </p>
              <p className="console-line text-emerald-300/80 mb-2 text-[13px]">
                &gt; encryption AES-256-GCM · new random key per file
              </p>
              <div className="hr-line" />

              {(status === 'IDLE' || status === 'READY') && (
                <div
                  className={
                    'relative mt-4 drop-area flex flex-col items-center justify-center px-4 py-7 cursor-pointer text-center transition-colors rounded-md border ' +
                    (isHoverEncrypt
                      ? 'drop-area-hover border-emerald-400 bg-emerald-500/5'
                      : 'border-emerald-800 bg-black/30 hover:border-emerald-400 hover:bg-emerald-500/5')
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsHoverEncrypt(true);
                  }}
                  onDragLeave={() => setIsHoverEncrypt(false)}
                  onDrop={handleDropEncrypt}
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
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleBrowseEncrypt}
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

              {status === 'READY' && file && (
                <div className="mt-4 space-y-2">
                  <p className="text-[13px] text-emerald-200/90">
                    Choose what to do with this file:
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="btn inline-flex items-center gap-1 px-3 py-2 text-[13px] rounded-md border border-emerald-700 font-semibold bg-emerald-500 text-black hover:bg-emerald-400"
                      onClick={() => startEncrypt('UPLOAD')}
                    >
                      <Lock size={15} />
                      <span>Encrypt and create link</span>
                    </button>
                    <button
                      className="inline-flex items-center gap-1 px-3 py-2 text-[13px] rounded-md border border-emerald-700 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-800/70 transition-colors"
                      onClick={() => startEncrypt('LOCAL_ONLY')}
                    >
                      <Lock size={15} />
                      <span>Encrypt only (no upload)</span>
                    </button>
                    <button
                      className="btn inline-flex items-center gap-3 px-3 py-2 text-[13px] rounded-md border border-emerald-700 bg-black/40 text-emerald-200 hover:bg-black/60 transition-colors"
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
                      Encryption complete. Your encrypted file is ready.
                    </span>
                  </div>

                  {downloadUrl && (
                    <div className="mt-2">
                      <p className="text-[13px] text-emerald-200/90 mb-1">
                        Download the encrypted file (local backup):
                      </p>
                      <button
                        onClick={() => {
                          if (!downloadUrl) return;
                          triggerDownload(downloadUrl, `${file?.name || 'file'}.enc`);
                        }}
                      >
                        Download encrypted file
                      </button>
                    </div>
                  )}

                  {shareLink && (
                    <div className="mt-2">
                      <p className="text-[13px] text-emerald-200/90 mb-1">
                        Copy or share this encrypted link:
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 border border-emerald-700/80 px-2 py-1.5 overflow-hidden bg-black/30 rounded">
                          <span className="text-[13px] truncate">
                            {shareLink ?? 'Link not available'}
                          </span>
                        </div>
                        <button
                          className="btn inline-flex items-center gap-1 px-3 py-2 text-[13px] rounded-md border border-emerald-700 font-semibold bg-emerald-500 text-black hover:bg-emerald-400"
                          onClick={copyLink}
                          disabled={!shareLink}
                        >
                          {copied ? 'Copied' : 'Copy link'}
                        </button>
                      </div>
                    </div>
                  )}

                  {keyString && (
                    <div className="mt-2 text-[12px] text-emerald-300/80 break-all">
                      Key (keep this secret, without it the file is lost): {keyString}
                    </div>
                  )}

                  <div className="mt-2">
                    <p className="text-[13px] text-emerald-200/90 mb-1">
                      When you are finished with this file:
                    </p>
                    <button
                      className="inline-flex items-center justify-center text-[13px] px-3 py-2 rounded-md border border-emerald-700 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-800/70 transition-colors"
                      onClick={reset}
                    >
                      Start again with a new file
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 hr-line" />
              <div className="mt-2">
                {status === 'IDLE' && (
                  <p className="text-[11px] text-emerald-300/70 mt-1">
                    Online sharing limit: up to {MAX_UPLOAD_MB} MB. For larger files, use
                    &quot;Encrypt only&quot; and store the encrypted file wherever you
                    prefer.
                    <br /> <br />
                    Offline encryption and decryption depend on your CPU, RAM and browser.
                    Very large files (above ~1–2 GB) can take a long time or freeze the
                    page, especially on weaker machines.
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
                {encryptError && (
                  <p className="console-line text-[13px] text-red-400">
                    &gt; error: {encryptError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* PANNELLO DECRYPT */}
          <div className="w-full lg:w-1/2">
            <div className="panel rounded-xl p-5 h-full min-h-[420px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-emerald-300 font-mono">[ DECRYPT_AREA ]</span>
                <span className="text-[12px] text-emerald-500 font-mono">
                  LOCAL DECRYPT · NO UPLOAD
                </span>
              </div>

              <p className="console-line text-emerald-300/85 mb-2 text-[13px]">
                &gt; drop an encrypted file and paste the key to recover the original
              </p>
              <div className="hr-line" />

              <div className="mt-4 space-y-3">
                <div
                  className={
                    'relative mt-1 drop-area flex flex-col items-center justify-center px-4 py-6 cursor-pointer text-center transition-colors rounded-md border ' +
                    (isHoverDecrypt
                      ? 'drop-area-hover border-emerald-400 bg-emerald-500/5'
                      : 'border-emerald-800 bg-black/30 hover:border-emerald-400 hover:bg-emerald-500/5')
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsHoverDecrypt(true);
                  }}
                  onDragLeave={() => setIsHoverDecrypt(false)}
                  onDrop={handleDropDecrypt}
                >
                  <Upload className="mb-3 text-emerald-300" size={24} />
                  {!encryptedFile ? (
                    <>
                      <p className="text-[14px] font-semibold">
                        Drag an encrypted file (.enc) here
                      </p>
                      <p className="text-emerald-300/75 text-[12px] mt-1">
                        or click to choose an .enc file from your device
                      </p>
                      <input
                        type="file"
                        accept=".enc"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleBrowseDecrypt}
                      />
                    </>
                  ) : (
                    <div className="max-w-full">
                      <div className="bg-black/40 border border-emerald-800 rounded-md px-3 py-2">
                        <p className="font-semibold text-[14px] truncate max-w-[260px] mx-auto">
                          {encryptedFile.name}
                        </p>
                        <p className="text-[12px] text-emerald-300/80 mt-1">
                          {(encryptedFile.size / 1024 / 1024).toFixed(2)} MB encrypted
                        </p>
                      </div>
                      <p className="text-[12px] text-emerald-300/65 mt-2">
                        Drop another .enc file here to replace it.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[13px] text-emerald-200/90 mb-1">
                    Key (the same you got after encryption):
                  </p>
                  <input
                    type="text"
                    className="w-full bg-black/40 border border-emerald-800 rounded px-2 py-1.5 text-[13px] text-emerald-100"
                    placeholder="Paste keyString here (base64:base64)"
                    value={decryptKey}
                    onChange={(e) => setDecryptKey(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex items-center gap-1 px-3 py-2 text-[13px] rounded-md border border-emerald-700 font-semibold bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50"
                    onClick={handleDecrypt}
                    disabled={!encryptedFile || !decryptKey}
                  >
                    <Lock size={15} />
                    <span>Decrypt file locally</span>
                  </button>

                  {(encryptedFile || decryptError) && (
                    <button
                      className="inline-flex items-center gap-1 px-3 py-2 text-[13px] rounded-md border border-emerald-700 bg-black/40 text-emerald-200 hover:bg-black/60 transition-colors"
                      onClick={resetDecrypt}
                    >
                      Clear and choose another encrypted file
                    </button>
                  )}
                </div>

                {decryptedUrl && (
                  <div className="mt-2">
                    <p className="text-[13px] text-emerald-200/90 mb-1">
                      Decryption successful. Download the original file:
                    </p>
                    <a
                      href={decryptedUrl}
                      download={decryptedFileName}
                      onClick={() => {
                        setTimeout(() => {
                          resetDecrypt();
                        }, 0);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-black/40 border border-emerald-700 text-[13px] hover:bg-black/60"
                    >
                      Download decrypted file
                    </a>
                  </div>
                )}

                {decryptError && (
                  <p className="console-line text-[13px] text-red-400">
                    &gt; error: {decryptError}
                  </p>
                )}

                <p className="text-[11px] text-emerald-300/70 mt-1">
                  Decrypting very large encrypted files also depends on your machine.
                  Files larger than ~1–2 GB may fail to decrypt or can freeze the browser,
                  because the entire file must be loaded into memory before processing.
                </p>
              </div>
            </div>
          </div>
        </main>

        <div className="mt-1 text-center text-[13px] text-emerald-300/80 leading-relaxed px-1">
          <p className="mb-1">
            Encryption and decryption happen entirely inside your browser.
            The server only ever sees encrypted blobs, never your key or plaintext file.
          </p>
          <p className="mb-1">
            If you lose the key or the link, the data cannot be recovered by us or by anyone else. 
          </p>
          <p className="mb-1">
            This is by design: no recovery, no logs, no backdoors.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
