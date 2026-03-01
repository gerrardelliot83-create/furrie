'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../dialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'md:max-w-[400px]',
  md: 'md:max-w-[520px]',
  lg: 'md:max-w-[680px]',
} as const;

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(sizeClasses[size])}>
        {/* Mobile handle bar */}
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border md:hidden" aria-hidden="true" />

        {(title || showCloseButton) && (
          <div className="mb-4 flex items-center justify-between">
            {title ? (
              <DialogTitle>{title}</DialogTitle>
            ) : (
              /* Radix requires a Title for accessibility; hide it visually when no title */
              <DialogTitle className="sr-only">Dialog</DialogTitle>
            )}
            {showCloseButton && (
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-foreground active:scale-95"
                onClick={onClose}
                aria-label="Close modal"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {!title && !showCloseButton && (
          /* Always provide an accessible title even when hidden */
          <DialogTitle className="sr-only">Dialog</DialogTitle>
        )}

        {/* Hidden description for screen readers */}
        <DialogDescription className="sr-only">Dialog content</DialogDescription>

        <div>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
