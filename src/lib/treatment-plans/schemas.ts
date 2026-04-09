/**
 * Hand-written validators for Treatment Plan section payloads.
 *
 * The project does not use zod — API routes validate by hand and return
 * structured { error, code } responses. This module provides:
 *
 *   - TypeScript types for every section (single source of truth)
 *   - parse* functions that normalize unknown JSONB input into the typed
 *     shape with safe defaults (never throw, used on reads)
 *   - validate* functions that return a list of human-readable errors
 *     (used on writes — PATCH autosave and POST finalize)
 *
 * On API routes, use:
 *   const draft = parseTreatmentPlanDraft(body);
 *   const errors = validateTreatmentPlanDraft(draft);
 *   if (errors.length) return 400 with { error: errors[0], code: 'VALIDATION_ERROR' };
 */

// ============================================================================
// Types
// ============================================================================

export type MedicationRoute =
  | 'oral'
  | 'topical'
  | 'injection'
  | 'eye_drops'
  | 'ear_drops'
  | 'rectal'
  | 'inhalation'
  | 'other';

export const MEDICATION_ROUTES: ReadonlyArray<MedicationRoute> = [
  'oral',
  'topical',
  'injection',
  'eye_drops',
  'ear_drops',
  'rectal',
  'inhalation',
  'other',
];

export type LabTestUrgency = 'routine' | 'urgent' | 'stat';
export const LAB_TEST_URGENCIES: ReadonlyArray<LabTestUrgency> = [
  'routine',
  'urgent',
  'stat',
];

export type FollowUpMode = 'teleconsult' | 'in_person' | 'none';
export const FOLLOW_UP_MODES: ReadonlyArray<FollowUpMode> = [
  'teleconsult',
  'in_person',
  'none',
];

export interface TreatmentPlanMedication {
  name: string;
  dosage: string;
  route: MedicationRoute;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface TreatmentPlanLabTest {
  name: string;
  urgency: LabTestUrgency;
  rationale: string;
  instructions: string;
}

export interface TreatmentPlanFollowUp {
  timeframe: string;
  mode: FollowUpMode;
  notes: string;
}

export interface TreatmentPlanCustomSection {
  title: string;
  body: string;
  order: number;
}

export interface TreatmentPlanDraft {
  observations: string;
  diagnosis: string;
  lab_tests: TreatmentPlanLabTest[];
  medications: TreatmentPlanMedication[];
  diet_nutrition: string;
  home_care: string;
  warning_signs: string;
  follow_up: TreatmentPlanFollowUp;
  in_person_advisory: string;
  custom_sections: TreatmentPlanCustomSection[];
}

// ============================================================================
// Limits
// ============================================================================

const LIMITS = {
  observations: 5000,
  diagnosis: 1000,
  dietNutrition: 5000,
  homeCare: 5000,
  warningSigns: 2000,
  inPersonAdvisory: 2000,
  medicationName: 200,
  medicationField: 100,
  medicationInstructions: 1000,
  labTestName: 200,
  labTestText: 500,
  followUpText: 1000,
  customSectionTitle: 120,
  customSectionBody: 5000,
  medicationsCount: 30,
  labTestsCount: 20,
  customSectionsCount: 20,
} as const;

// ============================================================================
// Utilities
// ============================================================================

function asString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function asEnum<T extends string>(
  v: unknown,
  allowed: ReadonlyArray<T>,
  fallback: T
): T {
  if (typeof v === 'string' && (allowed as ReadonlyArray<string>).includes(v)) {
    return v as T;
  }
  return fallback;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

// ============================================================================
// Parsers (unknown → typed, with safe defaults, never throw)
// ============================================================================

export function parseMedication(v: unknown): TreatmentPlanMedication {
  const o = asRecord(v);
  return {
    name: asString(o.name, LIMITS.medicationName),
    dosage: asString(o.dosage, LIMITS.medicationField),
    route: asEnum(o.route, MEDICATION_ROUTES, 'oral'),
    frequency: asString(o.frequency, LIMITS.medicationField),
    duration: asString(o.duration, LIMITS.medicationField),
    instructions: asString(o.instructions, LIMITS.medicationInstructions),
  };
}

export function parseLabTest(v: unknown): TreatmentPlanLabTest {
  const o = asRecord(v);
  return {
    name: asString(o.name, LIMITS.labTestName),
    urgency: asEnum(o.urgency, LAB_TEST_URGENCIES, 'routine'),
    rationale: asString(o.rationale, LIMITS.labTestText),
    instructions: asString(o.instructions, LIMITS.labTestText),
  };
}

export function parseFollowUp(v: unknown): TreatmentPlanFollowUp {
  const o = asRecord(v);
  return {
    timeframe: asString(o.timeframe, LIMITS.medicationField),
    mode: asEnum(o.mode, FOLLOW_UP_MODES, 'none'),
    notes: asString(o.notes, LIMITS.followUpText),
  };
}

export function parseCustomSection(
  v: unknown,
  fallbackOrder: number
): TreatmentPlanCustomSection {
  const o = asRecord(v);
  const orderRaw = o.order;
  const order =
    typeof orderRaw === 'number' && Number.isFinite(orderRaw)
      ? Math.max(0, Math.floor(orderRaw))
      : fallbackOrder;
  return {
    title: asString(o.title, LIMITS.customSectionTitle),
    body: asString(o.body, LIMITS.customSectionBody),
    order,
  };
}

export function parseTreatmentPlanDraft(v: unknown): TreatmentPlanDraft {
  const o = asRecord(v);
  return {
    observations: asString(o.observations, LIMITS.observations),
    diagnosis: asString(o.diagnosis, LIMITS.diagnosis),
    lab_tests: asArray(o.lab_tests)
      .slice(0, LIMITS.labTestsCount)
      .map(parseLabTest),
    medications: asArray(o.medications)
      .slice(0, LIMITS.medicationsCount)
      .map(parseMedication),
    diet_nutrition: asString(o.diet_nutrition, LIMITS.dietNutrition),
    home_care: asString(o.home_care, LIMITS.homeCare),
    warning_signs: asString(o.warning_signs, LIMITS.warningSigns),
    follow_up: parseFollowUp(o.follow_up),
    in_person_advisory: asString(o.in_person_advisory, LIMITS.inPersonAdvisory),
    custom_sections: asArray(o.custom_sections)
      .slice(0, LIMITS.customSectionsCount)
      .map((item, idx) => parseCustomSection(item, idx)),
  };
}

// ============================================================================
// Validators (return list of human-readable errors; empty array == valid)
// ============================================================================

/**
 * Validate a draft for autosave. Only rejects clearly-bad data (e.g. a
 * medication row with no name). Empty sections are allowed while drafting.
 */
export function validateTreatmentPlanDraft(draft: TreatmentPlanDraft): string[] {
  const errors: string[] = [];

  draft.medications.forEach((m, i) => {
    if (!m.name.trim()) {
      errors.push(`Medication #${i + 1} is missing a name.`);
    }
  });

  draft.lab_tests.forEach((t, i) => {
    if (!t.name.trim()) {
      errors.push(`Lab test #${i + 1} is missing a name.`);
    }
  });

  draft.custom_sections.forEach((s, i) => {
    if (!s.title.trim()) {
      errors.push(`Custom section #${i + 1} is missing a title.`);
    }
  });

  return errors;
}

/**
 * Stricter check applied only when transitioning draft → finalized.
 * Returns the list of missing/invalid items so the UI can show a
 * "before you finalize" checklist.
 */
export function validateTreatmentPlanForFinalize(
  draft: TreatmentPlanDraft
): string[] {
  const errors = validateTreatmentPlanDraft(draft);

  if (!draft.diagnosis.trim()) {
    errors.push('Diagnosis is required before finalizing.');
  }
  if (!draft.warning_signs.trim()) {
    errors.push('Warning signs are required before finalizing.');
  }

  const hasMeds = draft.medications.some((m) => m.name.trim().length > 0);
  const hasLabs = draft.lab_tests.some((t) => t.name.trim().length > 0);
  const hasFollowUp = draft.follow_up.mode !== 'none';

  if (!hasMeds && !hasLabs && !hasFollowUp) {
    errors.push(
      'A treatment plan must include at least one medication, lab test, or follow-up instruction.'
    );
  }

  return errors;
}

// ============================================================================
// Empty / default factories
// ============================================================================

export function emptyMedication(): TreatmentPlanMedication {
  return {
    name: '',
    dosage: '',
    route: 'oral',
    frequency: '',
    duration: '',
    instructions: '',
  };
}

export function emptyLabTest(): TreatmentPlanLabTest {
  return { name: '', urgency: 'routine', rationale: '', instructions: '' };
}

export function emptyFollowUp(): TreatmentPlanFollowUp {
  return { timeframe: '', mode: 'none', notes: '' };
}

export function emptyCustomSection(order: number): TreatmentPlanCustomSection {
  return { title: '', body: '', order };
}

export function emptyTreatmentPlanDraft(): TreatmentPlanDraft {
  return {
    observations: '',
    diagnosis: '',
    lab_tests: [],
    medications: [],
    diet_nutrition: '',
    home_care: '',
    warning_signs: '',
    follow_up: emptyFollowUp(),
    in_person_advisory: '',
    custom_sections: [],
  };
}
