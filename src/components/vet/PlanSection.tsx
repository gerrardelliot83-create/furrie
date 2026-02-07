'use client';

import { useCallback } from 'react';
import { MedicationEntry } from './MedicationEntry';
import type { PrescribedMedication } from '@/types';
import styles from './SOAPSections.module.css';

interface PlanData {
  medications: PrescribedMedication[];
  dietaryRecommendations: string;
  lifestyleModifications: string;
  homeCareInstructions: string;
  warningSigns: string;
  followUpTimeframe: string;
  inPersonVisitRecommended: boolean;
  inPersonUrgency: 'low' | 'medium' | 'high' | 'emergency' | null;
  referralSpecialist: string;
  additionalDiagnostics: string;
}

interface PlanSectionProps {
  data: PlanData;
  onChange: (updates: Partial<PlanData>) => void;
}

const EMPTY_MEDICATION: PrescribedMedication = {
  name: '',
  dosage: '',
  route: '',
  frequency: '',
  duration: '',
  instructions: '',
};

const FOLLOW_UP_OPTIONS = [
  '24 hours',
  '48 hours',
  '3 days',
  '1 week',
  '2 weeks',
  '1 month',
  'As needed',
  'After completing treatment',
];

export function PlanSection({ data, onChange }: PlanSectionProps) {
  const handleAddMedication = useCallback(() => {
    onChange({
      medications: [...data.medications, { ...EMPTY_MEDICATION }],
    });
  }, [data.medications, onChange]);

  const handleUpdateMedication = useCallback((index: number, medication: PrescribedMedication) => {
    const newMedications = [...data.medications];
    newMedications[index] = medication;
    onChange({ medications: newMedications });
  }, [data.medications, onChange]);

  const handleRemoveMedication = useCallback((index: number) => {
    onChange({
      medications: data.medications.filter((_, i) => i !== index),
    });
  }, [data.medications, onChange]);

  return (
    <div className={styles.sectionGrid}>
      {/* Medications */}
      <div className={styles.fullWidth}>
        <label className={styles.label}>Medications</label>
        <div className={styles.medicationsContainer}>
          {data.medications.map((medication, index) => (
            <MedicationEntry
              key={index}
              medication={medication}
              onChange={(med) => handleUpdateMedication(index, med)}
              onRemove={() => handleRemoveMedication(index)}
            />
          ))}
          <button
            type="button"
            className={styles.addMedicationButton}
            onClick={handleAddMedication}
          >
            + Add Medication
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div className={styles.halfWidth}>
        <label className={styles.label}>Dietary Recommendations</label>
        <textarea
          value={data.dietaryRecommendations}
          onChange={(e) => onChange({ dietaryRecommendations: e.target.value })}
          placeholder="Diet changes, feeding schedule, etc."
          className={styles.textarea}
          rows={3}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Lifestyle Modifications</label>
        <textarea
          value={data.lifestyleModifications}
          onChange={(e) => onChange({ lifestyleModifications: e.target.value })}
          placeholder="Exercise restrictions, rest requirements, etc."
          className={styles.textarea}
          rows={3}
        />
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Home Care Instructions</label>
        <textarea
          value={data.homeCareInstructions}
          onChange={(e) => onChange({ homeCareInstructions: e.target.value })}
          placeholder="Detailed care instructions for the pet parent"
          className={styles.textarea}
          rows={4}
        />
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Warning Signs to Watch For</label>
        <textarea
          value={data.warningSigns}
          onChange={(e) => onChange({ warningSigns: e.target.value })}
          placeholder="Symptoms that should prompt immediate vet visit"
          className={styles.textarea}
          rows={3}
        />
      </div>

      {/* Follow-up */}
      <div className={styles.halfWidth}>
        <label className={styles.label}>Follow-up Timeframe</label>
        <select
          value={data.followUpTimeframe}
          onChange={(e) => onChange({ followUpTimeframe: e.target.value })}
          className={styles.select}
        >
          <option value="">Select timeframe...</option>
          {FOLLOW_UP_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* In-person visit recommendation */}
      <div className={styles.halfWidth}>
        <label className={styles.label}>In-Person Visit Recommended?</label>
        <div className={styles.toggleContainer}>
          <button
            type="button"
            className={`${styles.toggleButton} ${!data.inPersonVisitRecommended ? styles.active : ''}`}
            onClick={() => onChange({ inPersonVisitRecommended: false, inPersonUrgency: null })}
          >
            No
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${data.inPersonVisitRecommended ? styles.active : ''}`}
            onClick={() => onChange({ inPersonVisitRecommended: true })}
          >
            Yes
          </button>
        </div>
        {data.inPersonVisitRecommended && (
          <div className={styles.urgencyContainer}>
            <label className={styles.smallLabel}>Urgency Level:</label>
            <div className={styles.urgencyButtons}>
              {(['low', 'medium', 'high', 'emergency'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`${styles.urgencyButton} ${styles[level]} ${data.inPersonUrgency === level ? styles.active : ''}`}
                  onClick={() => onChange({ inPersonUrgency: level })}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional diagnostics */}
      <div className={styles.halfWidth}>
        <label className={styles.label}>Additional Diagnostics Needed</label>
        <textarea
          value={data.additionalDiagnostics}
          onChange={(e) => onChange({ additionalDiagnostics: e.target.value })}
          placeholder="Blood work, X-rays, ultrasound, etc."
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Referral to Specialist</label>
        <textarea
          value={data.referralSpecialist}
          onChange={(e) => onChange({ referralSpecialist: e.target.value })}
          placeholder="Specialist type if referral is recommended"
          className={styles.textarea}
          rows={2}
        />
      </div>
    </div>
  );
}
