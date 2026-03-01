'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'min-h-10 py-2 px-3',
  md: 'min-h-12 py-3 px-4',
  lg: 'min-h-14 py-4 px-5',
} as const;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      size = 'md',
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;

    return (
      <div className={cn('flex w-full flex-col gap-1', className)}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-4 flex items-center justify-center text-muted-foreground/60 transition-colors duration-150 peer-focus:text-furrie-blue">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'peer w-full appearance-none rounded-lg border-[1.5px] border-border bg-white text-[max(16px,1rem)] font-normal leading-normal text-foreground transition-[border-color,box-shadow,background-color] duration-150',
              'placeholder:text-muted-foreground/50',
              'hover:not-disabled:not-focus:border-muted-foreground/40',
              'focus:border-furrie-blue focus:ring-3 focus:ring-furrie-blue/15 focus:outline-none',
              sizeClasses[size],
              error && 'border-error focus:border-error focus:ring-error/15 hover:not-disabled:not-focus:border-error',
              leftIcon && 'pl-[calc(1rem+24px)]',
              rightIcon && 'pr-[calc(1rem+24px)]',
              disabled && 'cursor-not-allowed opacity-50 bg-muted'
            )}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />
          {rightIcon && (
            <span className="pointer-events-none absolute right-4 flex items-center justify-center text-muted-foreground/60 transition-colors duration-150">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <span id={`${inputId}-error`} className="mt-1 text-xs text-error" role="alert">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span id={`${inputId}-helper`} className="mt-1 text-xs text-muted-foreground/60">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
