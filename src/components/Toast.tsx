import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    info: <CheckCircle2 size={18} className="text-emerald-400" />,
  };

  const bgColors = {
    success: 'bg-emerald-900/90 border-emerald-700',
    error: 'bg-red-900/90 border-red-700',
    info: 'bg-emerald-900/90 border-emerald-700',
  };

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border ${bgColors[type]}`}>
        {icons[type]}
        <span className="text-[13px] text-emerald-100">{message}</span>
        <button onClick={onClose} className="ml-2 text-emerald-400/50 hover:text-emerald-300 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}

export default Toast;
