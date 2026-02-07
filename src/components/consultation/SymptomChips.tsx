'use client';

import { useTranslations } from 'next-intl';
import { SYMPTOM_CATEGORIES, type SymptomCategory } from '@/lib/data/symptoms';
import { cn } from '@/lib/utils';
import styles from './SymptomChips.module.css';

interface SymptomChipsProps {
  selected: string[];
  onChange: (symptoms: string[]) => void;
  className?: string;
}

export function SymptomChips({ selected, onChange, className }: SymptomChipsProps) {
  const t = useTranslations('symptoms');

  const toggleSymptom = (symptom: SymptomCategory) => {
    if (selected.includes(symptom)) {
      onChange(selected.filter((s) => s !== symptom));
    } else {
      onChange([...selected, symptom]);
    }
  };

  return (
    <div className={cn(styles.container, className)}>
      {SYMPTOM_CATEGORIES.map((symptom) => {
        const isSelected = selected.includes(symptom);
        const isBreathingDifficulty = symptom === 'breathing_difficulty';

        return (
          <button
            key={symptom}
            type="button"
            className={cn(
              styles.chip,
              isSelected && styles.selected,
              isBreathingDifficulty && styles.urgent
            )}
            onClick={() => toggleSymptom(symptom)}
            aria-pressed={isSelected}
          >
            {t(symptom)}
            {isBreathingDifficulty && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.warningIcon}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
