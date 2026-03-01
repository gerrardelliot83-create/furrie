import { type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center font-medium rounded-full whitespace-nowrap',
  {
    variants: {
      variant: {
        success: 'bg-success-light text-success',
        warning: 'bg-warning-light text-warning',
        error: 'bg-error-light text-error',
        info: 'bg-info-light text-info',
        neutral: 'bg-muted text-muted-foreground',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-0.5',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: ReactNode;
}

export function Badge({
  variant,
  size,
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </span>
  );
}
