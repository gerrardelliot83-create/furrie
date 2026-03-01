'use client';

import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-[2px]',
  md: 'h-6 w-6 border-[2px]',
  lg: 'h-8 w-8 border-[3px]',
} as const;

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'inline-block rounded-full border-muted animate-spin border-t-furrie-blue',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
