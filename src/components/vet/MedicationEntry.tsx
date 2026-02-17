'use client';

import type { PrescribedMedication } from '@/types';
import type { MedicationOption } from '@/lib/data/medications';
import { COMMON_DURATIONS } from '@/lib/data/medications';
import { MedicationSearch } from './MedicationSearch';
import { FieldAutocomplete } from './FieldAutocomplete';
import styles from './MedicationEntry.module.css';

const ROUTE_OPTIONS = [
  'Oral',
  'Topical',
  'Injectable',
  'Otic (Ear)',
  'Ophthalmic (Eye)',
  'Rectal',
  'Inhalation',
  'Subcutaneous',
];

const FREQUENCY_OPTIONS = [
  'SID (once daily)',
  'BID (twice daily)',
  'TID (three times daily)',
  'QID (four times daily)',
  'Every other day',
  'Weekly',
  'Monthly',
  'As needed',
  'Once, repeat in 2-3 weeks',
];

interface MedicationEntryProps {
  medication: PrescribedMedication;
  onChange: (medication: PrescribedMedication) => void;
  onRemove: () => void;
  petSpecies?: 'dog' | 'cat';
  diagnosis?: string;
}

export function MedicationEntry({ medication, onChange, onRemove, petSpecies, diagnosis }: MedicationEntryProps) {
  const handleFieldChange = (field: keyof PrescribedMedication, value: string | boolean) => {
    onChange({ ...medication, [field]: value });
  };

  const handleMedicationSelect = (med: MedicationOption) => {
    // Auto-fill defaults from the known medication
    onChange({
      ...medication,
      name: med.name,
      dosage: med.commonDosages[0] || medication.dosage,
      route: med.commonRoutes[0] || medication.route,
      frequency: med.commonFrequencies[0] || medication.frequency,
      isFromList: true,
    });
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
          <MedicationSearch
            value={medication.name}
            onChange={(value) => handleFieldChange('name', value)}
            onMedicationSelect={handleMedicationSelect}
            onIsFromListChange={(isFromList) => handleFieldChange('isFromList', isFromList)}
            placeholder="Search medications or type custom..."
            petSpecies={petSpecies}
            diagnosis={diagnosis}
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
          <FieldAutocomplete
            value={medication.route}
            onChange={(value) => handleFieldChange('route', value)}
            options={ROUTE_OPTIONS}
            placeholder="e.g., Oral"
          />
        </div>

        {/* Frequency */}
        <div className={styles.field}>
          <label className={styles.label}>Frequency</label>
          <FieldAutocomplete
            value={medication.frequency}
            onChange={(value) => handleFieldChange('frequency', value)}
            options={FREQUENCY_OPTIONS}
            placeholder="e.g., Twice daily"
          />
        </div>

        {/* Duration */}
        <div className={styles.field}>
          <label className={styles.label}>Duration</label>
          <FieldAutocomplete
            value={medication.duration}
            onChange={(value) => handleFieldChange('duration', value)}
            options={COMMON_DURATIONS}
            placeholder="e.g., 7 days"
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
