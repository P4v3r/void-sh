import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { decryptFile } from './crypto';
import { Lock, Download } from 'lucide-react';

import { createClient} from '@supabase/supabase-js';

//const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
//const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseUrl = 'https://rsnjdhkrgtuepivllvux.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbmpkaGtyZ3R1ZXBpdmxsdnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODExNTEsImV4cCI6MjA4MDc1NzE1MX0.WKxJB0TMJw3_zBvQsI3vpQxWbrT824OzdHtefgnNvPo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

//let supabase: SupabaseClient | null = null;

/*if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.error('Supabase environment variables are missing in this environment');
}*/

function DownloadPage() {
  const { objectPath } = useParams(); // viene da /d/:objectPath
  const [status, setStatus] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (!objectPath) {
          setError('Missing file identifier in URL');
          setStatus('ERROR');
          return;
        }

        // 1) recupera la chiave dall'hash #...
        const hash = window.location.hash; // es. "#KEY:IV"
        const keyString = decodeURIComponent(hash.replace(/^#/, ''));
        if (!keyString) {
          setError('Missing decryption key in URL hash');
          setStatus('ERROR');
          return;
        }

        if (!supabase) {
          setError('Server configuration error: storage is not available right now.');
          setStatus('ERROR');
          return;
        }

        // 2) scarica il blob cifrato da Supabase
        const { data, error: downloadError } = await supabase.storage
          .from('vault-files')
          .download(objectPath);


        if (downloadError || !data) {
          console.error(downloadError);
          setError('Could not download encrypted file.');
          setStatus('ERROR');
          return;
        }

        // 3) decifra nel browser
        const decryptedBlob = await decryptFile(data, keyString);

        // 4) crea URL per download
        const url = URL.createObjectURL(decryptedBlob);
        setDownloadUrl(url);
        setStatus('READY');
      } catch (e) {
        console.error(e);
        setError('Decryption failed. The link or key may be invalid.');
        setStatus('ERROR');
      }
    };

    run();
  }, [objectPath]);

  return (
    <div className="min-h-screen text-[15px] text-emerald-100 bg-[#050b10]">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col min-h-screen">
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
                <p className="text-[13px] text-emerald-300/90">
                  Decrypting a shared file in your browser.
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

        <main className="mt-6 flex-1 flex items-center justify-center">
          {status === 'LOADING' && (
            <div className="flex flex-col items-center gap-3">
              <Lock className="text-emerald-400 animate-pulse" size={28} />
              <p className="text-[14px] text-emerald-200">
                Fetching and decrypting the file in your browser…
              </p>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="text-center">
              <p className="text-[14px] text-red-400 mb-2">&gt; error: {error}</p>
              <p className="text-[13px] text-emerald-300/80">
                The link may be expired, invalid, or the key in the URL hash is wrong.
              </p>
            </div>
          )}

          {status === 'READY' && downloadUrl && (
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-300">
                <Download size={20} />
                <span className="text-[15px]">File decrypted. Ready to download.</span>
              </div>
              <a
                href={downloadUrl}
                download="file"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-500 text-black text-[14px] font-semibold hover:bg-emerald-400 transition-colors"
              >
                <Download size={16} />
                <span>Download file</span>
              </a>
              <p className="text-[12px] text-emerald-300/75">
                The file was decrypted locally. No plaintext was stored on our servers.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default DownloadPage;