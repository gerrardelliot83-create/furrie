'use client';

import { type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Toaster } from '../sonner';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastData['type'], duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

function showToast(message: string, type: ToastData['type'] = 'info', duration = 4000) {
  const opts = { duration };
  switch (type) {
    case 'success':
      sonnerToast.success(message, opts);
      break;
    case 'error':
      sonnerToast.error(message, opts);
      break;
    case 'warning':
      sonnerToast.warning(message, opts);
      break;
    case 'info':
    default:
      sonnerToast.info(message, opts);
      break;
  }
}

const toastApi: ToastContextType = {
  toast: showToast,
  success: (message, duration) => showToast(message, 'success', duration),
  error: (message, duration) => showToast(message, 'error', duration),
  info: (message, duration) => showToast(message, 'info', duration),
  warning: (message, duration) => showToast(message, 'warning', duration),
};

/**
 * useToast hook — returns a static toast API powered by sonner.
 * No Context needed — the API is stable and doesn't change.
 */
export function useToast(): ToastContextType {
  return toastApi;
}

/**
 * ToastProvider — renders children + sonner's <Toaster />.
 * Backward-compatible wrapper: consumers still wrap with <ToastProvider>.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
