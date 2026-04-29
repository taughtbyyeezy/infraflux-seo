import React, { useSyncExternalStore } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { toastStore, Toast as ToastType } from '../lib/toastStore';
import './Toast.css';

const icons = { success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info };

const ToastItem: React.FC<{ toast: ToastType }> = ({ toast }) => {
  const Icon = icons[toast.type];
  return (
    <div className={`toast-item toast-${toast.type}`}>
      <div className="toast-icon">
        <Icon size={20} />
      </div>
      <div className="toast-content">
        <p className="toast-message">{toast.message}</p>
      </div>
      <button 
        className="toast-close" 
        onClick={() => toastStore.removeToast(toast.id)}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getSnapshot);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} />)}
    </div>
  );
};
