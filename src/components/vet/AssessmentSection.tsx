'use client';

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

export function AssessmentSection({ data, onChange }: AssessmentSectionProps) {
  return (
    <div className={styles.sectionGrid}>
      <div className={styles.fullWidth}>
        <label className={styles.label}>
          Provisional Diagnosis <span className={styles.required}>*</span>
        </label>
        <textarea
          value={data.provisionalDiagnosis}
          onChange={(e) => onChange({ provisionalDiagnosis: e.target.value })}
          placeholder="Enter provisional diagnosis..."
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Differential Diagnoses</label>
        <textarea
          value={data.differentialDiagnoses.join('\n')}
          onChange={(e) => onChange({
            differentialDiagnoses: e.target.value.split('\n').filter(d => d.trim())
          })}
          placeholder="Enter each differential diagnosis on a new line..."
          className={styles.textarea}
          rows={3}
        />
        <p className={styles.hint}>Enter each diagnosis on a separate line</p>
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
