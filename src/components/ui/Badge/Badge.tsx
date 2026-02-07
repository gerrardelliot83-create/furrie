import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from './Badge.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(styles.badge, styles[variant], styles[size], className)}
      {...props}
    >
      {children}
    </span>
  );
}
