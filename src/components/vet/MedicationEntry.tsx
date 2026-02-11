'use client';

import type { PrescribedMedication } from '@/types';
import styles from './MedicationEntry.module.css';

interface MedicationEntryProps {
  medication: PrescribedMedication;
  onChange: (medication: PrescribedMedication) => void;
  onRemove: () => void;
}

export function MedicationEntry({ medication, onChange, onRemove }: MedicationEntryProps) {
  const handleFieldChange = (field: keyof PrescribedMedication, value: string) => {
    onChange({ ...medication, [field]: value });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Medication</span>
        <button type="button" className={styles.removeButton} onClick={onRemove}>
          Remove
        </button>
      </div>

      <div className={styles.grid}>
        {/* Medication Name */}
        <div className={styles.fullWidth}>
          <label className={styles.label}>Medication Name</label>
          <input
            type="text"
            value={medication.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Enter medication name..."
            className={styles.input}
          />
        </div>

        {/* Dosage */}
        <div className={styles.field}>
          <label className={styles.label}>Dosage</label>
          <input
            type="text"
            value={medication.dosage}
            onChange={(e) => handleFieldChange('dosage', e.target.value)}
            placeholder="e.g., 10 mg/kg"
            className={styles.input}
          />
        </div>

        {/* Route */}
        <div className={styles.field}>
          <label className={styles.label}>Route</label>
          <input
            type="text"
            value={medication.route}
            onChange={(e) => handleFieldChange('route', e.target.value)}
            placeholder="e.g., Oral"
            className={styles.input}
          />
        </div>

        {/* Frequency */}
        <div className={styles.field}>
          <label className={styles.label}>Frequency</label>
          <input
            type="text"
            value={medication.frequency}
            onChange={(e) => handleFieldChange('frequency', e.target.value)}
            placeholder="e.g., Twice daily"
            className={styles.input}
          />
        </div>

        {/* Duration */}
        <div className={styles.field}>
          <label className={styles.label}>Duration</label>
          <input
            type="text"
            value={medication.duration}
            onChange={(e) => handleFieldChange('duration', e.target.value)}
            placeholder="e.g., 7 days"
            className={styles.input}
          />
        </div>

        {/* Special Instructions */}
        <div className={styles.fullWidth}>
          <label className={styles.label}>Special Instructions</label>
          <textarea
            value={medication.instructions}
            onChange={(e) => handleFieldChange('instructions', e.target.value)}
            placeholder="e.g., Give with food, avoid dairy..."
            className={styles.textarea}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
