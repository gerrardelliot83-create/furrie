import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';
import styles from './Avatar.module.css';

export interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  colorVariant?: 'default' | 'blue' | 'sage' | 'butter' | 'navy';
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const colorVariantMap: Record<string, string | undefined> = {
  default: undefined,
  blue: styles.colorBlue,
  sage: styles.colorSage,
  butter: styles.colorButter,
  navy: styles.colorNavy,
};

export function Avatar({
  src,
  alt,
  size = 'md',
  fallback,
  colorVariant = 'default',
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
      className={cn(
        styles.avatar,
        styles.fallback,
        colorVariantMap[colorVariant],
        styles[size],
        className
      )}
      aria-label={alt}
    >
      <span className={styles.initials}>{initials}</span>
    </div>
  );
}
