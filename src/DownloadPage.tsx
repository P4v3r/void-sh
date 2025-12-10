import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Download, AlertTriangle, CheckCircle2, FileDown } from 'lucide-react';

// --- SUPABASE CONFIG ---
const supabaseUrl = 'https://rsnjdhkrgtuepivllvux.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbmpkaGtyZ3R1ZXBpdmxsdnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODExNTEsImV4cCI6MjA4MDc1NzE1MX0.WKxJB0TMJw3_zBvQsI3vpQxWbrT824OzdHtefgnNvPo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DownloadPage: React.FC = () => {
  const [status, setStatus] = useState<'INITIALIZING' | 'READY' | 'COMPLETED' | 'ERROR'>('INITIALIZING');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('file.enc');

  useEffect(() => {
    const init = async () => {
      try {
        const path = window.location.pathname;
        const prefix = '/d/';
        if (!path.startsWith(prefix)) {
          throw new Error('Invalid download link format.');
        }

        const encodedObjectPath = path.slice(prefix.length);
        const objectPath = decodeURIComponent(encodedObjectPath);

        // Estrai nome file dall'URL (es. uuid.enc o uuid.bin)
        const n = fileName;
        if (n == fileName) {
        }else{
        }
        const name = objectPath.split('/').pop() || 'file.enc';
        setFileName(name);

        // Ottieni URL Pubblico DIRETTO (senza processing)
        const { data } = supabase.storage
          .from('vault-files')
          .getPublicUrl(objectPath);
        
        if (!data?.publicUrl) {
          throw new Error('File not found.');
        }

        // Aggiungi ?download per forzare il download del browser
        const url = `${data.publicUrl}?download=${encodeURIComponent(name)}`;
        setDownloadUrl(url);
        setStatus('READY');

        // Auto-download dopo 1 secondo
        setTimeout(() => {
            window.location.href = url;
            setStatus('COMPLETED');
        }, 1000);

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Unknown error occurred.');
        setStatus('ERROR');
      }
    };

    init();
  }, []);

  const handleManualDownload = () => {
    if (downloadUrl) {
      window.location.href = downloadUrl;
      setStatus('COMPLETED');
    }
  };

  return (
    <div className="min-h-screen bg-[#050b10] text-[15px] text-emerald-100 flex items-center justify-center font-mono overflow-hidden">
       <div className="w-full max-w-2xl px-6 py-8 relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>

          <div className="text-center mb-8 relative z-10">
            <h1 className="text-[20px] font-bold text-emerald-100 tracking-wide uppercase">
              Raw File Download
            </h1>
            <p className="text-[13px] text-emerald-400/70 mt-2">
              Debug Mode: Downloading Encrypted Blob
            </p>
          </div>

          <div className="bg-[#0a1219] border border-emerald-900/40 rounded-xl p-8 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-emerald-900/30">
                  <span className="text-[13px] font-bold text-emerald-500/80 uppercase tracking-wider">Status</span>
                  <span className={`text-[13px] font-bold ${status === 'ERROR' ? 'text-red-400' : 'text-emerald-400'}`}>
                      [{status}]
                  </span>
              </div>

              {status === 'ERROR' && (
                <div className="text-center py-8">
                   <AlertTriangle size={48} className="mx-auto text-red-400 mb-4 opacity-80" />
                   <p className="text-red-200 font-bold mb-2">FAILED</p>
                   <p className="text-red-300/60 text-[13px]">{error}</p>
                </div>
              )}

              {(status === 'INITIALIZING' || status === 'READY') && (
                 <div className="text-center py-8 animate-pulse">
                    <Download size={48} className="mx-auto text-emerald-500 mb-4 opacity-80" />
                    <p className="text-emerald-100 font-bold mb-2">FETCHING RAW FILE...</p>
                 </div>
              )}

              {status === 'COMPLETED' && (
                 <div className="text-center py-6">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
                    <p className="text-emerald-100 font-bold mb-2">DOWNLOAD STARTED</p>
                    <p className="text-emerald-400/60 text-[13px] mb-6">
                       You should receive a .enc or .bin file (not the original).
                    </p>
                    <button 
                      onClick={handleManualDownload}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded uppercase tracking-wide text-[14px] transition-all"
                    >
                      <FileDown size={18} /> Download Raw Blob
                    </button>
                 </div>
              )}
          </div>
       </div>
    </div>
  );
};

export default DownloadPage;
