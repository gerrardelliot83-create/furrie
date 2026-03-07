'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Pet } from '@/types';
import { cn } from '@/lib/utils';
import styles from './PetSelector.module.css';

interface PetSelectorProps {
  pets: Pet[];
  selectedPetId: string | null;
  onSelect: (petId: string) => void;
  onAddPet?: () => void;
  className?: string;
}

export function PetSelector({
  pets,
  selectedPetId,
  onSelect,
  onAddPet,
  className,
}: PetSelectorProps) {
  const t = useTranslations('pets');
  const tConsultation = useTranslations('consultation');

  return (
    <div className={cn(styles.container, className)}>
      <h2 className={styles.title}>{tConsultation('selectPet')}</h2>
      <p className={styles.subtitle}>Which pet needs help today?</p>

      <div className={styles.grid}>
        {pets.map((pet) => {
          const isSelected = pet.id === selectedPetId;
          const primaryPhoto = pet.photoUrls?.[0];

          return (
            <button
              key={pet.id}
              type="button"
              className={cn(styles.petCard, isSelected && styles.selected)}
              onClick={() => onSelect(pet.id)}
              aria-pressed={isSelected}
            >
              <div className={cn(styles.avatar, !primaryPhoto && (pet.species === 'dog' ? styles.avatarDog : styles.avatarCat))}>
                {primaryPhoto ? (
                  <Image
                    src={primaryPhoto}
                    alt={pet.name}
                    width={64}
                    height={64}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {pet.species === 'dog' ? '\u{1F415}' : '\u{1F408}'}
                  </div>
                )}
              </div>
              <div className={styles.petInfo}>
                <span className={styles.petName}>{pet.name}</span>
                <span className={styles.petBreed}>{pet.breed}</span>
              </div>
              <div className={styles.checkmark}>
                {isSelected && (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}

        {onAddPet && (
          <button
            type="button"
            className={cn(styles.petCard, styles.addCard)}
            onClick={onAddPet}
          >
            <div className={styles.addIcon}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className={styles.addText}>{t('addPet')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
