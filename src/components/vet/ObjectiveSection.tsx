'use client';

import type { VitalSigns } from '@/types';
import { BodyConditionScore } from './BodyConditionScore';
import styles from './SOAPSections.module.css';

interface ObjectiveData {
  generalAppearance: string;
  bodyConditionScore: string;
  visiblePhysicalFindings: string;
  respiratoryPattern: string;
  gaitMobility: string;
  vitalSigns: VitalSigns;
  referencedMediaUrls: string[];
}

interface ObjectiveSectionProps {
  data: ObjectiveData;
  onChange: (updates: Partial<ObjectiveData>) => void;
  petSpecies: 'dog' | 'cat';
}

export function ObjectiveSection({ data, onChange, petSpecies }: ObjectiveSectionProps) {
  const handleVitalChange = (field: keyof VitalSigns, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onChange({
      vitalSigns: {
        ...data.vitalSigns,
        [field]: numValue,
      },
    });
  };

  return (
    <div className={styles.sectionGrid}>
      <div className={styles.fullWidth}>
        <label className={styles.label}>General Appearance</label>
        <textarea
          value={data.generalAppearance}
          onChange={(e) => onChange({ generalAppearance: e.target.value })}
          placeholder="Alert, responsive, coat condition, hydration status, etc."
          className={styles.textarea}
          rows={3}
        />
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Body Condition Score</label>
        <BodyConditionScore
          value={data.bodyConditionScore}
          onChange={(value) => onChange({ bodyConditionScore: value })}
          species={petSpecies}
        />
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Visible Physical Findings</label>
        <textarea
          value={data.visiblePhysicalFindings}
          onChange={(e) => onChange({ visiblePhysicalFindings: e.target.value })}
          placeholder="Describe any visible abnormalities observed during video consultation"
          className={styles.textarea}
          rows={3}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Respiratory Pattern</label>
        <textarea
          value={data.respiratoryPattern}
          onChange={(e) => onChange({ respiratoryPattern: e.target.value })}
          placeholder="Normal, labored, rapid, etc."
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Gait/Mobility</label>
        <textarea
          value={data.gaitMobility}
          onChange={(e) => onChange({ gaitMobility: e.target.value })}
          placeholder="Normal, limping, ataxic, etc."
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Vital Signs (if reported by owner)</label>
        <div className={styles.vitalsGrid}>
          <div className={styles.vitalField}>
            <label className={styles.smallLabel}>Temperature (°C)</label>
            <input
              type="number"
              step="0.1"
              value={data.vitalSigns.temperature ?? ''}
              onChange={(e) => handleVitalChange('temperature', e.target.value)}
              placeholder="e.g., 38.5"
              className={styles.input}
            />
          </div>
          <div className={styles.vitalField}>
            <label className={styles.smallLabel}>Heart Rate (bpm)</label>
            <input
              type="number"
              value={data.vitalSigns.heartRate ?? ''}
              onChange={(e) => handleVitalChange('heartRate', e.target.value)}
              placeholder="e.g., 120"
              className={styles.input}
            />
          </div>
          <div className={styles.vitalField}>
            <label className={styles.smallLabel}>Respiratory Rate (breaths/min)</label>
            <input
              type="number"
              value={data.vitalSigns.respiratoryRate ?? ''}
              onChange={(e) => handleVitalChange('respiratoryRate', e.target.value)}
              placeholder="e.g., 20"
              className={styles.input}
            />
          </div>
          <div className={styles.vitalField}>
            <label className={styles.smallLabel}>Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={data.vitalSigns.weight ?? ''}
              onChange={(e) => handleVitalChange('weight', e.target.value)}
              placeholder="e.g., 12.5"
              className={styles.input}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
