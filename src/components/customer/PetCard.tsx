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
  /** When provided, intercepts card click to open detail panel instead of navigating */
  onCardClick?: (id: string) => void;
  /** When provided, intercepts edit click to open edit panel instead of navigating */
  onEditClick?: (id: string) => void;
  className?: string;
}

export function PetCard({ pet, onDelete, onCardClick, onEditClick, className }: PetCardProps) {
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
      <Link
        href={`/pets/${pet.id}`}
        className={styles.cardLink}
        onClick={onCardClick ? (e) => { e.preventDefault(); onCardClick(pet.id); } : undefined}
      >
        <div className={styles.content}>
          <div className={cn(styles.avatar, primaryPhoto && (pet.species === 'dog' ? styles.avatarDog : styles.avatarCat))}>
            {primaryPhoto ? (
              <Image
                src={primaryPhoto}
                alt={pet.name}
                width={80}
                height={80}
                className={styles.avatarImage}
              />
            ) : (
              <img
                src={pet.species === 'dog' ? '/assets/dog-avatar.png' : '/assets/cat-avatar.png'}
                alt={pet.species === 'dog' ? 'Dog' : 'Cat'}
                className={styles.avatarFallback}
              />
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
        <Link
          href={`/pets/${pet.id}/edit`}
          onClick={onEditClick ? (e) => { e.preventDefault(); onEditClick(pet.id); } : undefined}
        >
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
