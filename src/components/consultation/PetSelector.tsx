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
              <div className={styles.avatar}>
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
                    {pet.species === 'dog' ? (
                      <svg
                        width="32"
                        height="32"
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
                        width="32"
                        height="32"
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
