import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Quick helper
export const toast = {
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'info' }),
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'success' }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'warning' }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ title, message, type: 'error' }),
};
