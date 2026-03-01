'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast: 'bg-white border border-border shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-foreground',
          success: 'border-l-[3px] !border-l-success [&>[data-icon]]:text-success',
          error: 'border-l-[3px] !border-l-error [&>[data-icon]]:text-error',
          warning: 'border-l-[3px] !border-l-warning [&>[data-icon]]:text-warning',
          info: 'border-l-[3px] !border-l-info [&>[data-icon]]:text-info',
        },
      }}
    />
  );
}
