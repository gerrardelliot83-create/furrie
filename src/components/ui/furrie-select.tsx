'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'min-h-10 py-2 px-3',
  md: 'min-h-12 py-3 px-4',
  lg: 'min-h-14 py-4 px-5',
} as const;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      size = 'md',
      className,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className={cn('flex w-full flex-col gap-1', className)}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'peer w-full cursor-pointer appearance-none rounded-lg border-[1.5px] border-border bg-white pr-[calc(1rem+24px)] text-[max(16px,1rem)] font-normal leading-normal text-foreground transition-[border-color,box-shadow,background-color] duration-150',
              'hover:not-disabled:not-focus:border-muted-foreground/40',
              'focus:border-furrie-blue focus:ring-3 focus:ring-furrie-blue/15 focus:outline-none',
              sizeClasses[size],
              error && 'border-error focus:border-error focus:ring-error/15 hover:not-disabled:not-focus:border-error',
              disabled && 'cursor-not-allowed opacity-50 bg-muted'
            )}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${selectId}-error`
                : helperText
                  ? `${selectId}-helper`
                  : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-4 flex items-center justify-center text-muted-foreground/60 transition-colors duration-150 peer-focus:text-furrie-blue"
            aria-hidden="true"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        {error && (
          <span id={`${selectId}-error`} className="mt-1 text-xs text-error" role="alert">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span id={`${selectId}-helper`} className="mt-1 text-xs text-muted-foreground/60">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
