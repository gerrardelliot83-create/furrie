'use client';

import styles from './BodyConditionScore.module.css';

interface BodyConditionScoreProps {
  value: string;
  onChange: (value: string) => void;
  species?: 'dog' | 'cat';
}

const BCS_OPTIONS = [
  { score: '1', label: 'Emaciated', description: 'Ribs, spine, bones very prominent. Severe muscle loss.' },
  { score: '2', label: 'Very Thin', description: 'Ribs easily felt. Minimal fat covering. Obvious waist.' },
  { score: '3', label: 'Thin', description: 'Ribs easily palpable. Obvious waist. Abdominal tuck evident.' },
  { score: '4', label: 'Underweight', description: 'Ribs palpable with minimal fat. Waist easily noted.' },
  { score: '5', label: 'Ideal', description: 'Ribs palpable without excess fat. Waist observed behind ribs. Abdominal tuck.' },
  { score: '6', label: 'Overweight', description: 'Ribs palpable with slight excess fat. Waist discernible but not prominent.' },
  { score: '7', label: 'Heavy', description: 'Ribs difficult to feel. Fat deposits over back and tail base. Waist absent.' },
  { score: '8', label: 'Obese', description: 'Ribs not palpable under heavy fat. Fat deposits over spine and tail. No waist.' },
  { score: '9', label: 'Severely Obese', description: 'Massive fat deposits. Obvious abdominal distension. Fat deposits on neck and limbs.' },
];

export function BodyConditionScore({ value, onChange }: BodyConditionScoreProps) {
  return (
    <div className={styles.container}>
      <div className={styles.scaleContainer}>
        {BCS_OPTIONS.map((option) => (
          <button
            key={option.score}
            type="button"
            className={`${styles.scoreButton} ${value === option.score ? styles.selected : ''}`}
            onClick={() => onChange(option.score)}
            title={`${option.label}: ${option.description}`}
          >
            {option.score}
          </button>
        ))}
      </div>

      <div className={styles.labels}>
        <span className={styles.labelLeft}>Underweight</span>
        <span className={styles.labelCenter}>Ideal</span>
        <span className={styles.labelRight}>Overweight</span>
      </div>

      {value && (
        <div className={styles.selectedInfo}>
          <strong>{BCS_OPTIONS.find(o => o.score === value)?.label}</strong>
          <p>{BCS_OPTIONS.find(o => o.score === value)?.description}</p>
        </div>
      )}
    </div>
  );
}
