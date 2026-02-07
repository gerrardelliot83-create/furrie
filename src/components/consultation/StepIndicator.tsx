'use client';

import { cn } from '@/lib/utils';
import styles from './StepIndicator.module.css';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
  className,
}: StepIndicatorProps) {
  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.steps}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div
              key={stepNumber}
              className={cn(
                styles.step,
                isCompleted && styles.completed,
                isCurrent && styles.current
              )}
            >
              <div className={styles.circle}>
                {isCompleted ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className={styles.number}>{stepNumber}</span>
                )}
              </div>
              {labels && labels[index] && (
                <span className={styles.label}>{labels[index]}</span>
              )}
              {stepNumber < totalSteps && <div className={styles.connector} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
