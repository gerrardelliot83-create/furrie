'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './StepResponseForm.module.css';

interface StepResponseFormProps {
  onSubmit: (responseText: string, mediaUrls: string[], mediaTypes: string[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function StepResponseForm({ onSubmit, onCancel, isSubmitting }: StepResponseFormProps) {
  const [responseText, setResponseText] = useState('');

  const handleSubmit = () => {
    if (!responseText.trim()) {
      return;
    }
    onSubmit(responseText.trim(), [], []);
  };

  return (
    <div className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="responseText">
          Your Response
        </label>
        <textarea
          id="responseText"
          className={styles.textarea}
          placeholder="Describe how this step went, any observations, etc."
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          rows={3}
        />
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!responseText.trim()}
        >
          Submit & Complete
        </Button>
      </div>
    </div>
  );
}
