'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, disabled, ...props }, ref) => {
    const textareaId = id || props.name;

    return (
      <div className={cn('flex w-full flex-col gap-1', className)}>
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full min-h-[120px] appearance-none resize-y rounded-lg border-[1.5px] border-border bg-white px-4 py-3 text-[max(16px,1rem)] font-normal leading-normal text-foreground transition-[border-color,box-shadow,background-color] duration-150',
            'placeholder:text-muted-foreground/50',
            'hover:not-disabled:not-focus:border-muted-foreground/40',
            'focus:border-furrie-blue focus:ring-3 focus:ring-furrie-blue/15 focus:outline-none',
            error && 'border-error focus:border-error focus:ring-error/15 hover:not-disabled:not-focus:border-error',
            disabled && 'cursor-not-allowed opacity-50 bg-muted'
          )}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          {...props}
        />
        {error && (
          <span id={`${textareaId}-error`} className="mt-1 text-xs text-error" role="alert">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span id={`${textareaId}-helper`} className="mt-1 text-xs text-muted-foreground/60">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
