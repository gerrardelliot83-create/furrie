'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Pet } from '@/types';
import { calculateAge, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import styles from './PetCard.module.css';

interface PetCardProps {
  pet: Pet;
  onDelete?: (id: string) => void;
  className?: string;
}

export function PetCard({ pet, onDelete, className }: PetCardProps) {
  const t = useTranslations('pets');
  const tCommon = useTranslations('common');

  // Calculate age
  const ageDisplay = useMemo(() => {
    if (pet.dateOfBirth) {
      const { years, months } = calculateAge(pet.dateOfBirth);
      if (years > 0) {
        return months > 0 ? `${years}y ${months}m` : `${years}y`;
      }
      return `${months}m`;
    }
    if (pet.approximateAgeMonths) {
      const years = Math.floor(pet.approximateAgeMonths / 12);
      const months = pet.approximateAgeMonths % 12;
      if (years > 0) {
        return months > 0 ? `${years}y ${months}m` : `${years}y`;
      }
      return `${months}m`;
    }
    return null;
  }, [pet.dateOfBirth, pet.approximateAgeMonths]);

  const primaryPhoto = pet.photoUrls?.[0];

  return (
    <div className={cn(styles.card, className)}>
      <Link href={`/pets/${pet.id}`} className={styles.cardLink}>
        <div className={styles.content}>
          <div className={styles.avatar}>
            {primaryPhoto ? (
              <Image
                src={primaryPhoto}
                alt={pet.name}
                width={80}
                height={80}
                className={styles.avatarImage}
              />
            ) : (
              <div className={styles.avatarFallback}>
                {pet.species === 'dog' ? (
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" />
                    <path d="M8 14v.5M16 14v.5" />
                    <path d="M11.25 16.25h1.5L12 17l-.75-.75z" />
                    <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306" />
                  </svg>
                ) : (
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5z" />
                    <path d="M8 14v.5M16 14v.5" />
                    <path d="M11.25 16.25h1.5L12 17l-.75-.75z" />
                  </svg>
                )}
              </div>
            )}
          </div>
          <div className={styles.info}>
            <h3 className={styles.name}>{pet.name}</h3>
            <p className={styles.breed}>{pet.breed}</p>
            <div className={styles.meta}>
              {ageDisplay && <span className={styles.age}>{ageDisplay}</span>}
              <Badge
                variant={pet.gender === 'male' ? 'info' : 'warning'}
                size="sm"
              >
                {t(pet.gender)}
              </Badge>
            </div>
          </div>
        </div>
      </Link>
      <div className={styles.actions}>
        <Link href={`/pets/${pet.id}/edit`}>
          <Button variant="ghost" size="sm">
            {tCommon('edit')}
          </Button>
        </Link>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(pet.id)}
            className={styles.deleteButton}
          >
            {tCommon('delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
