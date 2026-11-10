import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Global helper to trigger toast from anywhere in the app without prop drilling
 * @param {string} message - Message text
 * @param {'success'|'error'|'warning'|'info'} type - Toast type
 * @param {number} duration - Auto dismiss timeout in ms (default: 3500)
 */
export function showToast(message, type = 'info', duration = 3500) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          message,
          type,
          duration
        }
      })
    );
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const newToast = e.detail;
      if (!newToast || !newToast.message) return;

      setToasts((prev) => [...prev.slice(-3), newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(newToast.id);
        }, newToast.duration);
      }
    };

    window.addEventListener('app-toast', handleToastEvent);
    return () => window.removeEventListener('app-toast', handleToastEvent);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-2xl border-2 shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${
              isSuccess
                ? 'bg-emerald-950/95 border-emerald-500 text-white shadow-emerald-950/40'
                : isError
                ? 'bg-rose-950/95 border-rose-500 text-white shadow-rose-950/40'
                : isWarning
                ? 'bg-amber-950/95 border-amber-500 text-white shadow-amber-950/40'
                : 'bg-slate-900/95 border-blue-500 text-white shadow-slate-950/40'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2.5]" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400 stroke-[2.5]" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 stroke-[2.5]" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400 stroke-[2.5]" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-black leading-snug whitespace-pre-line">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
