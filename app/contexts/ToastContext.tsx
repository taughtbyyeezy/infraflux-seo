import { toastStore, ToastType } from '../lib/toastStore';

export type { Toast, ToastType } from '../lib/toastStore';

export const useToast = () => {
  return {
    addToast: (message: string, type: ToastType, duration?: number) =>
      toastStore.addToast(message, type, duration),
    removeToast: (id: string) =>
      toastStore.removeToast(id)
  };
};
