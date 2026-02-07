/**
 * Symptom categories for consultation pre-screening
 * Used in Direct Connect flow to help vets prepare
 */

export const SYMPTOM_CATEGORIES = [
  'vomiting',
  'diarrhea',
  'skin_issue',
  'limping',
  'loss_of_appetite',
  'behavioral_change',
  'eye_ear_issue',
  'breathing_difficulty',
  'other',
] as const;

export type SymptomCategory = (typeof SYMPTOM_CATEGORIES)[number];

/**
 * Symptoms that trigger an emergency disclaimer warning
 * These indicate potentially life-threatening conditions
 */
export const SEVERE_SYMPTOMS: SymptomCategory[] = ['breathing_difficulty'];

/**
 * Check if any of the selected symptoms are severe
 */
export function hasSevereSymptoms(symptoms: string[]): boolean {
  return symptoms.some((symptom) =>
    SEVERE_SYMPTOMS.includes(symptom as SymptomCategory)
  );
}

/**
 * Symptom display labels (for use with i18n keys)
 * Maps symptom ID to translation key
 */
export const SYMPTOM_I18N_KEYS: Record<SymptomCategory, string> = {
  vomiting: 'symptoms.vomiting',
  diarrhea: 'symptoms.diarrhea',
  skin_issue: 'symptoms.skin_issue',
  limping: 'symptoms.limping',
  loss_of_appetite: 'symptoms.loss_of_appetite',
  behavioral_change: 'symptoms.behavioral_change',
  eye_ear_issue: 'symptoms.eye_ear_issue',
  breathing_difficulty: 'symptoms.breathing_difficulty',
  other: 'symptoms.other',
};
