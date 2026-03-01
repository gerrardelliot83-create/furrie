import { cn } from '@/lib/utils';

export interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

const variantClasses = {
  text: 'h-4 w-full rounded-sm',
  circle: 'rounded-full',
  rect: 'rounded-lg',
} as const;

export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (count > 1) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={cn('animate-pulse bg-muted', variantClasses[variant], className)}
            style={style}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('animate-pulse bg-muted', variantClasses[variant], className)}
      style={style}
      aria-hidden="true"
    />
  );
}

// Pre-configured skeleton components
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded-sm bg-muted"
          style={{ width: index === lines - 1 ? '60%' : '100%' }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return (
    <div
      className="animate-pulse rounded-full bg-muted"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-4 flex gap-3">
        <SkeletonAvatar />
        <div className="flex flex-1 flex-col justify-center gap-2">
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
