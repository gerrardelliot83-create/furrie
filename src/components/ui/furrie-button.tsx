'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Spinner } from './furrie-spinner';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 font-semibold leading-none rounded-lg transition-[background-color,border-color,color,box-shadow,transform] duration-150 whitespace-nowrap select-none [-webkit-tap-highlight-color:transparent] cursor-pointer border-[1.5px] border-transparent overflow-hidden w-full md:w-auto',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-br from-furrie-yellow to-furrie-green text-furrie-dark-blue shadow-sm hover:not-disabled:shadow-md active:not-disabled:scale-[0.98] active:not-disabled:shadow-sm',
        secondary:
          'bg-transparent text-furrie-blue border-furrie-blue hover:not-disabled:bg-furrie-blue hover:not-disabled:text-white hover:not-disabled:shadow-sm active:not-disabled:scale-[0.98]',
        ghost:
          'bg-transparent text-muted-foreground hover:not-disabled:bg-muted hover:not-disabled:text-foreground active:not-disabled:scale-[0.98]',
        danger:
          'bg-error text-white border-error hover:not-disabled:bg-red-700 hover:not-disabled:border-red-700 active:not-disabled:scale-[0.98]',
        accent:
          'bg-error text-white border-error shadow-sm hover:not-disabled:bg-red-700 hover:not-disabled:border-red-700 hover:not-disabled:shadow-md active:not-disabled:scale-[0.98] active:not-disabled:shadow-sm',
      },
      size: {
        sm: 'min-h-9 px-3 py-2 text-sm',
        md: 'min-h-12 px-5 py-3 text-base',
        lg: 'min-h-14 px-6 py-4 text-[1.0625rem]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      loading = false,
      fullWidth = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && '!w-full',
          isDisabled && 'pointer-events-none opacity-50 cursor-not-allowed',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {leftIcon && (
          <span className={cn('flex shrink-0 items-center justify-center', loading && 'invisible')}>
            {leftIcon}
          </span>
        )}
        <span className={cn('flex items-center gap-2', loading && 'invisible')}>
          {children}
        </span>
        {rightIcon && (
          <span className={cn('flex shrink-0 items-center justify-center', loading && 'invisible')}>
            {rightIcon}
          </span>
        )}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Spinner size="sm" className="border-current border-t-transparent" />
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
