'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { SymptomChips } from '@/components/consultation/SymptomChips';
import styles from './EditConcernForm.module.css';

interface EditConcernFormProps {
  consultationId: string;
  initialConcern: string;
  initialSymptoms: string[];
}

export function EditConcernForm({ consultationId, initialConcern, initialSymptoms }: EditConcernFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [concernText, setConcernText] = useState(initialConcern);
  const [symptoms, setSymptoms] = useState<string[]>(initialSymptoms);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concernText, symptomCategories: symptoms }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }

      toast('Concerns updated successfully', 'success');
      router.push(`/consultations/${consultationId}`);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update concerns', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Describe your concern</label>
        <textarea
          value={concernText}
          onChange={(e) => setConcernText(e.target.value)}
          className={styles.textarea}
          rows={4}
          placeholder="Describe what's bothering your pet..."
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Symptoms</label>
        <SymptomChips selected={symptoms} onChange={setSymptoms} />
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push(`/consultations/${consultationId}`);
          }
        }}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSaving}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
