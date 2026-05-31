import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    setToasts((prevToasts) => {
      if (prevToasts.some((t) => t.message === message)) {
        return prevToasts;
      }
      const id = Math.random().toString(36).substring(2, 9);
      setTimeout(() => {
        setToasts((curr) => curr.filter((t) => t.id !== id));
      }, 3500);
      return [...prevToasts, { id, message, type }];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container positioned in the bottom-right corner */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const { message, type } = toast;
  
  // Icon and colors based on type
  let icon = <Info className="w-5 h-5" />;
  let bgColor = 'bg-slate-900 border-slate-800 text-slate-100';
  let iconColor = 'text-blue-400';
  
  if (type === 'success') {
    icon = <CheckCircle className="w-5 h-5" />;
    bgColor = 'bg-slate-900 border-slate-800 text-slate-100';
    iconColor = 'text-emerald-400';
  } else if (type === 'error') {
    icon = <AlertCircle className="w-5 h-5" />;
    bgColor = 'bg-slate-900 border-slate-800 text-slate-100';
    iconColor = 'text-rose-400';
  } else if (type === 'warning') {
    icon = <AlertTriangle className="w-5 h-5" />;
    bgColor = 'bg-slate-900 border-slate-800 text-slate-100';
    iconColor = 'text-amber-400';
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl pointer-events-auto animate-slide-in transition-all ${bgColor}`}
    >
      <div className={`flex-shrink-0 ${iconColor}`}>
        {icon}
      </div>
      <div className="flex-1 text-sm font-semibold leading-snug">
        {message}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
