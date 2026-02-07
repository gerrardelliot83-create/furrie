'use client';

import { useCallback } from 'react';
import { DiagnosisSearch } from './DiagnosisSearch';
import styles from './SOAPSections.module.css';

interface AssessmentData {
  provisionalDiagnosis: string;
  differentialDiagnoses: string[];
  confidenceLevel: 'low' | 'medium' | 'high' | null;
  teleconsultationLimitations: string;
}

interface AssessmentSectionProps {
  data: AssessmentData;
  onChange: (updates: Partial<AssessmentData>) => void;
  petSpecies: 'dog' | 'cat';
}

export function AssessmentSection({ data, onChange, petSpecies }: AssessmentSectionProps) {
  const handleAddDifferential = useCallback((diagnosis: string) => {
    if (!data.differentialDiagnoses.includes(diagnosis)) {
      onChange({
        differentialDiagnoses: [...data.differentialDiagnoses, diagnosis],
      });
    }
  }, [data.differentialDiagnoses, onChange]);

  const handleRemoveDifferential = useCallback((index: number) => {
    onChange({
      differentialDiagnoses: data.differentialDiagnoses.filter((_, i) => i !== index),
    });
  }, [data.differentialDiagnoses, onChange]);

  return (
    <div className={styles.sectionGrid}>
      <div className={styles.fullWidth}>
        <label className={styles.label}>
          Provisional Diagnosis <span className={styles.required}>*</span>
        </label>
        <DiagnosisSearch
          value={data.provisionalDiagnosis}
          onChange={(value) => onChange({ provisionalDiagnosis: value })}
          species={petSpecies}
          placeholder="Search or type diagnosis..."
        />
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Differential Diagnoses</label>
        <div className={styles.differentialContainer}>
          <DiagnosisSearch
            value=""
            onChange={handleAddDifferential}
            species={petSpecies}
            placeholder="Add differential diagnosis..."
          />
          {data.differentialDiagnoses.length > 0 && (
            <div className={styles.tagList}>
              {data.differentialDiagnoses.map((diagnosis, index) => (
                <span key={index} className={styles.tag}>
                  {diagnosis}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => handleRemoveDifferential(index)}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Confidence Level</label>
        <div className={styles.confidenceButtons}>
          {(['low', 'medium', 'high'] as const).map((level) => (
            <button
              key={level}
              type="button"
              className={`${styles.confidenceButton} ${data.confidenceLevel === level ? styles.active : ''}`}
              onClick={() => onChange({ confidenceLevel: level })}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
        <p className={styles.hint}>
          How confident are you in this diagnosis based on teleconsultation findings?
        </p>
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Teleconsultation Limitations</label>
        <textarea
          value={data.teleconsultationLimitations}
          onChange={(e) => onChange({ teleconsultationLimitations: e.target.value })}
          placeholder="Note any limitations in assessment due to virtual nature of consultation (e.g., unable to palpate, auscultate, perform lab work)"
          className={styles.textarea}
          rows={3}
        />
      </div>
    </div>
  );
}
