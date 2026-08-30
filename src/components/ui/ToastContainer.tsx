import React from 'react';
import { useToastStore, ToastType } from '@/stores/toastStore';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

const icons: Record<ToastType, React.ReactNode> = {
  info: <Info size={16} className="text-blue-400" />,
  success: <CheckCircle2 size={16} className="text-emerald-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  error: <AlertCircle size={16} className="text-red-400" />,
};

const borders: Record<ToastType, string> = {
  info: 'border-blue-500/40 bg-blue-950/90',
  success: 'border-emerald-500/40 bg-emerald-950/90',
  warning: 'border-amber-500/40 bg-amber-950/90',
  error: 'border-red-500/40 bg-red-950/90',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-8 right-6 z-50 flex flex-col space-y-2 pointer-events-none select-none max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto border rounded-lg shadow-2xl p-3 backdrop-blur-md flex items-start space-x-3 transition-all transform animate-in slide-in-from-bottom-2 duration-200 ${
            borders[t.type]
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">{t.title}</h4>
            {t.message && <p className="text-[11px] text-zinc-300 mt-0.5">{t.message}</p>}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="p-0.5 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
