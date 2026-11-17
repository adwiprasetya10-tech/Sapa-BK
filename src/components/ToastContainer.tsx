import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { useSiBK } from '../context/SiBKContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useSiBK();

  if (toasts.length === 0) return null;

  return (
    <div
      className="no-print fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const iconMap = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
        };

        const borderMap = {
          success: 'border-emerald-200 dark:border-emerald-800/70 bg-white dark:bg-slate-900',
          info: 'border-sky-200 dark:border-sky-800/70 bg-white dark:bg-slate-900',
          warning: 'border-amber-200 dark:border-amber-800/70 bg-white dark:bg-slate-900',
          error: 'border-rose-200 dark:border-rose-800/70 bg-white dark:bg-slate-900',
        };

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border ${borderMap[toast.type]} p-4 shadow-xl shadow-slate-900/10 transition-all duration-200`}
          >
            <div className="mt-0.5">{iconMap[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                {toast.title}
              </p>
              {toast.message && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors shrink-0"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
