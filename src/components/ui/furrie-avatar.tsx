'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, getInitials } from '@/lib/utils';

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
} as const;

const initialsSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
} as const;

export interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

export function Avatar({
  src,
  alt,
  size = 'md',
  fallback,
  className,
}: AvatarProps) {
  const initials = fallback || getInitials(alt);

  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        sizeClasses[size],
        className
      )}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full bg-furrie-blue text-white',
        )}
        aria-label={alt}
      >
        <span className={cn('font-semibold uppercase', initialsSizeClasses[size])}>
          {initials}
        </span>
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
