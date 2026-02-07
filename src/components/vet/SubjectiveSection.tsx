'use client';

import styles from './SOAPSections.module.css';

interface SubjectiveData {
  chiefComplaint: string;
  historyPresentIllness: string;
  behaviorChanges: string;
  appetiteChanges: string;
  activityLevelChanges: string;
  dietInfo: string;
  previousTreatments: string;
  environmentalFactors: string;
  otherPetsHousehold: string;
}

interface SubjectiveSectionProps {
  data: SubjectiveData;
  onChange: (updates: Partial<SubjectiveData>) => void;
}

export function SubjectiveSection({ data, onChange }: SubjectiveSectionProps) {
  return (
    <div className={styles.sectionGrid}>
      <div className={styles.fullWidth}>
        <label className={styles.label}>
          Chief Complaint <span className={styles.required}>*</span>
        </label>
        <textarea
          value={data.chiefComplaint}
          onChange={(e) => onChange({ chiefComplaint: e.target.value })}
          placeholder="Primary reason for consultation as described by pet parent"
          className={styles.textarea}
          rows={3}
        />
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>History of Present Illness</label>
        <textarea
          value={data.historyPresentIllness}
          onChange={(e) => onChange({ historyPresentIllness: e.target.value })}
          placeholder="When did symptoms start? How have they progressed?"
          className={styles.textarea}
          rows={3}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Behavior Changes</label>
        <textarea
          value={data.behaviorChanges}
          onChange={(e) => onChange({ behaviorChanges: e.target.value })}
          placeholder="Any changes in behavior?"
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Appetite Changes</label>
        <textarea
          value={data.appetiteChanges}
          onChange={(e) => onChange({ appetiteChanges: e.target.value })}
          placeholder="Eating/drinking changes?"
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Activity Level Changes</label>
        <textarea
          value={data.activityLevelChanges}
          onChange={(e) => onChange({ activityLevelChanges: e.target.value })}
          placeholder="More or less active than usual?"
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Diet Information</label>
        <textarea
          value={data.dietInfo}
          onChange={(e) => onChange({ dietInfo: e.target.value })}
          placeholder="Current diet, treats, recent changes"
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.fullWidth}>
        <label className={styles.label}>Previous Treatments</label>
        <textarea
          value={data.previousTreatments}
          onChange={(e) => onChange({ previousTreatments: e.target.value })}
          placeholder="Any treatments tried for this issue?"
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Environmental Factors</label>
        <textarea
          value={data.environmentalFactors}
          onChange={(e) => onChange({ environmentalFactors: e.target.value })}
          placeholder="Indoor/outdoor, recent travel, exposure to toxins"
          className={styles.textarea}
          rows={2}
        />
      </div>

      <div className={styles.halfWidth}>
        <label className={styles.label}>Other Pets in Household</label>
        <textarea
          value={data.otherPetsHousehold}
          onChange={(e) => onChange({ otherPetsHousehold: e.target.value })}
          placeholder="Other pets and their health status"
          className={styles.textarea}
          rows={2}
        />
      </div>
    </div>
  );
}
