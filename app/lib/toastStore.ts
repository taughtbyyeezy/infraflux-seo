export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

let toasts: Toast[] = [];
type Listener = (toasts: Toast[]) => void;
const listeners: Set<Listener> = new Set();

export const toastStore = {
  addToast: (message: string, type: ToastType = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, duration };
    toasts = [...toasts, newToast];
    toastStore.emit();
    if (duration > 0) {
      setTimeout(() => toastStore.removeToast(id), duration);
    }
  },
  removeToast: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    toastStore.emit();
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emit: () => listeners.forEach((listener) => listener(toasts)),
  getSnapshot: () => toasts,
};
