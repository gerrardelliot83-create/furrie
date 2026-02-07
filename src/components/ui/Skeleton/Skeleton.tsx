import { cn } from '@/lib/utils';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

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
      <div className={styles.stack}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={cn(styles.skeleton, styles[variant], className)}
            style={style}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(styles.skeleton, styles[variant], className)}
      style={style}
      aria-hidden="true"
    />
  );
}

// Pre-configured skeleton components
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(styles.skeleton, styles.text)}
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
      className={cn(styles.skeleton, styles.circle)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <SkeletonAvatar />
        <div className={styles.cardHeaderText}>
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
