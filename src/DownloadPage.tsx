import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Download, AlertTriangle, CheckCircle2, FileDown, Loader2 } from 'lucide-react';
import { decryptFile } from './crypto';

// --- SUPABASE CONFIG ---
const supabaseUrl = 'https://rsnjdhkrgtuepivllvux.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbmpkaGtyZ3R1ZXBpdmxsdnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODExNTEsImV4cCI6MjA4MDc1NzE1MX0.WKxJB0TMJw3_zBvQsI3vpQxWbrT824OzdHtefgnNvPo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DownloadPage: React.FC = () => {
  const [status, setStatus] = useState<'INITIALIZING' | 'DOWNLOADING' | 'DECRYPTING' | 'COMPLETED' | 'ERROR'>('INITIALIZING');
  const [error, setError] = useState<string | null>(null);
  
  const decryptedUrlRef = useRef<string | null>(null);
  const downloadStartedRef = useRef(false); // Flag per evitare doppi download
  const [fileName, setFileName] = useState<string>('decrypted_file');

  useEffect(() => {
    // Se abbiamo già iniziato il processo, fermati
    if (downloadStartedRef.current) return;
    downloadStartedRef.current = true;

    const processDownload = async () => {
      try {
        setStatus('DOWNLOADING');

        // 1. Parse URL & Key
        const path = window.location.pathname;
        const hash = window.location.hash;
        
        if (!hash || hash.length <= 1) {
            throw new Error('Decryption key missing from link.');
        }
        const keyString = decodeURIComponent(hash.substring(1));

        const prefix = '/d/';
        if (!path.startsWith(prefix)) {
          throw new Error('Invalid download link.');
        }

        const encodedObjectPath = path.slice(prefix.length);
        const objectPath = decodeURIComponent(encodedObjectPath);
        
        // RECUPERA ESTENSIONE ORIGINALE
        const parts = objectPath.split('.');
        let extension = '';
        if (parts.length > 1) {
            extension = '.' + parts.pop();
        }
        const finalName = `decrypted_file${extension}`;
        setFileName(finalName);

        // 2. Scarica il file cifrato
        const { data, error: downloadError } = await supabase.storage
          .from('vault-files')
          .download(objectPath);

        if (downloadError || !data) {
           throw new Error('File download failed. It may have been deleted.');
        }

        setStatus('DECRYPTING');

        // 3. Decripta
        const encryptedFile = new File([data], "encrypted.enc"); 
        const decryptedBlob = await decryptFile(encryptedFile, keyString);
        
        // 4. Prepara download
        const url = URL.createObjectURL(decryptedBlob);
        decryptedUrlRef.current = url;
        
        setStatus('COMPLETED');
        
        // Auto-trigger download (una sola volta grazie al ref, ma per sicurezza mettiamo un check)
        setTimeout(() => {
             triggerDownload(url, finalName);
        }, 800);

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

  const handleManualDownload = () => {
    if (decryptedUrlRef.current) {
        triggerDownload(decryptedUrlRef.current, fileName);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b10] text-[15px] text-emerald-100 flex items-center justify-center font-mono overflow-hidden">
       <div className="w-full max-w-2xl px-6 py-8 relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>

          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center gap-3 mb-4">
               <span className="inline-block px-2 py-0.5 border border-emerald-700 text-[14px] tracking-[0.15em] uppercase font bg-emerald-900/10">
                  void.sh
               </span>
            </div>
            <h1 className="text-[20px] font-bold text-emerald-100 tracking-wide uppercase">
              Secure Transfer
            </h1>
          </div>

          <div className="bg-[#0a1219] border border-emerald-900/40 rounded-xl p-8 shadow-2xl relative overflow-hidden">
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-emerald-900/30">
                  <span className="text-[13px] font-bold text-emerald-500/80 uppercase tracking-wider">Status</span>
                  <span className={`text-[13px] font ${status === 'ERROR' ? 'text-red-400' : 'text-emerald-400'}`}>
                      [{status}]
                  </span>
              </div>

              {status === 'ERROR' && (
                <div className="text-center py-8">
                   <AlertTriangle size={48} className="mx-auto text-red-400 mb-4 opacity-80" />
                   <p className="text-red-200 font-bold mb-2">ERROR</p>
                   <p className="text-red-300/60 text-[13px]">{error}</p>
                </div>
              )}

              {(status === 'DOWNLOADING' || status === 'INITIALIZING') && (
                 <div className="text-center py-8 animate-pulse">
                    <Download size={48} className="mx-auto text-emerald-500 mb-4 opacity-80" />
                    <p className="text-emerald-100 font-bold mb-2">DOWNLOADING ENCRYPTED DATA...</p>
                 </div>
              )}

              {status === 'DECRYPTING' && (
                 <div className="text-center py-8 animate-pulse">
                    <Loader2 size={48} className="mx-auto text-emerald-500 mb-4 opacity-80 animate-spin" />
                    <p className="text-emerald-100 font-bold mb-2">DECRYPTING IN BROWSER...</p>
                 </div>
              )}

              {status === 'COMPLETED' && (
                 <div className="text-center py-6">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
                    <p className="text-emerald-100 font-bold mb-2">FILE READY</p>
                    <p className="text-emerald-400/60 text-[13px] mb-6">
                       Decryption successful. Download starting...
                    </p>
                    <button 
                      onClick={handleManualDownload}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded uppercase tracking-wide text-[14px] transition-all cursor-pointer"
                    >
                      <FileDown size={18} /> Save File
                    </button>
                 </div>
              )}

          </div>
          
          <footer className="mt-8 text-center opacity-50">
            <p className="text-[11px] text-emerald-500/60 leading-relaxed font-light">
               // SECURITY NOTICE: DECRYPTION HAPPENS LOCALLY. <br/>
               // SERVER CANNOT READ YOUR DATA.
            </p>
          </footer>
       </div>
    </div>
  );
};

export default DownloadPage;
