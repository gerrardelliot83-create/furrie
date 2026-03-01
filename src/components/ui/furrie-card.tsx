import { type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'bg-white border border-border rounded-xl transition-shadow transition-transform duration-200',
  {
    variants: {
      variant: {
        default: 'shadow-sm',
        elevated: 'shadow-md border-transparent hover:shadow-lg hover:-translate-y-0.5',
        glass: 'bg-white/70 backdrop-blur-[12px] border-white/30 shadow-md hover:shadow-lg',
        warm: 'bg-furrie-white border-furrie-yellow/30',
        fullBleed: 'rounded-none border-x-0 -mx-[var(--page-padding-x,1rem)] md:rounded-xl md:border md:border-border md:mx-0',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3 md:p-4',
        md: 'p-4 md:p-6',
        lg: 'p-6 md:p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: ReactNode;
}

export function Card({
  variant,
  padding,
  children,
  className,
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant, padding }),
        onClick && 'cursor-pointer select-none [-webkit-tap-highlight-color:transparent] hover:shadow-md hover:border-furrie-yellow/50 active:scale-[0.99] active:shadow-sm',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-foreground leading-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground mb-0', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('pt-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-3 pt-4', className)} {...props}>
      {children}
    </div>
  );
}
