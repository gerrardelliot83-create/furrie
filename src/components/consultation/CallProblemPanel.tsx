'use client';

import type { CallProblem } from '@/lib/daily/callErrors';
import styles from './CallProblemPanel.module.css';

interface CallProblemPanelProps {
  problem: CallProblem | null;
  onRetry: () => void;
  onBack: () => void;
  backLabel?: string;
  children?: React.ReactNode;
}

/**
 * What went wrong with the call, in plain words, with Try again (VC-1).
 * Shared by the pet parent's and the vet's call pages.
 */
export function CallProblemPanel({ problem, onRetry, onBack, backLabel = 'Go back', children }: CallProblemPanelProps) {
  const retryLabel = problem?.kind === 'left-unexpectedly' ? 'Rejoin' : 'Try again';
  return (
    <div className={styles.panel} role="alert">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h2>{problem?.title ?? 'Unable to join'}</h2>
      <p>{problem?.message ?? 'Something went wrong. Please try again.'}</p>
      {children}
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onRetry}>
          {retryLabel}
        </button>
        <button type="button" className={styles.secondary} onClick={onBack}>
          {backLabel}
        </button>
      </div>
    </div>
  );
}
