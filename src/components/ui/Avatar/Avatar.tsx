import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';
import styles from './Avatar.module.css';

export interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export function Avatar({
  src,
  alt,
  size = 'md',
  fallback,
  className,
}: AvatarProps) {
  const initials = fallback || getInitials(alt);
  const pixelSize = sizeMap[size];

  if (src) {
    return (
      <div className={cn(styles.avatar, styles[size], className)}>
        <Image
          src={src}
          alt={alt}
          width={pixelSize}
          height={pixelSize}
          className={styles.image}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(styles.avatar, styles.fallback, styles[size], className)}
      aria-label={alt}
    >
      <span className={styles.initials}>{initials}</span>
    </div>
  );
}
