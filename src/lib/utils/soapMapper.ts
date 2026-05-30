import type { SoapNote, VitalSigns, PrescribedMedication } from '@/types';
import type { Database } from '@/lib/database.types';

type SoapNoteRow = Database['public']['Tables']['soap_notes']['Row'];
type SoapNoteInsert = Database['public']['Tables']['soap_notes']['Insert'];

/**
 * Thrown when an incoming SOAP payload fails validation. The API route maps
 * this to a 400 response (code VALIDATION_ERROR).
 */
export class SoapValidationError extends Error {
  code = 'VALIDATION_ERROR' as const;
  constructor(message: string) {
    super(message);
    this.name = 'SoapValidationError';
  }
}

const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
const IN_PERSON_URGENCIES = ['low', 'medium', 'high', 'emergency'] as const;

// camelCase (API) -> snake_case (DB) for the plain TEXT fields. Kept in one
// place so POST (full) and PATCH (partial) stay in sync with the schema.
const TEXT_FIELDS: Record<string, keyof SoapNoteRow> = {
  chiefComplaint: 'chief_complaint',
  historyPresentIllness: 'history_present_illness',
  behaviorChanges: 'behavior_changes',
  appetiteChanges: 'appetite_changes',
  activityLevelChanges: 'activity_level_changes',
  dietInfo: 'diet_info',
  previousTreatments: 'previous_treatments',
  environmentalFactors: 'environmental_factors',
  otherPetsHousehold: 'other_pets_household',
  generalAppearance: 'general_appearance',
  bodyConditionScore: 'body_condition_score',
  visiblePhysicalFindings: 'visible_physical_findings',
  respiratoryPattern: 'respiratory_pattern',
  gaitMobility: 'gait_mobility',
  provisionalDiagnosis: 'provisional_diagnosis',
  teleconsultationLimitations: 'teleconsultation_limitations',
  dietaryRecommendations: 'dietary_recommendations',
  lifestyleModifications: 'lifestyle_modifications',
  homeCareInstructions: 'home_care_instructions',
  warningSigns: 'warning_signs',
  followUpTimeframe: 'follow_up_timeframe',
  referralSpecialist: 'referral_specialist',
  additionalDiagnostics: 'additional_diagnostics',
};

// Trim a free-text value; empty string becomes null (mirrors SOAPForm `|| null`).
function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new SoapValidationError('Expected a string value for a text field');
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringArray(value: unknown, field: string): string[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new SoapValidationError(`${field} must be an array of strings`);
  }
  return value as string[];
}

function validateVitalSigns(value: unknown): VitalSigns {
  if (value === null || value === undefined) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new SoapValidationError('vitalSigns must be an object');
  }
  return value as VitalSigns;
}

function validateMedications(value: unknown): PrescribedMedication[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new SoapValidationError('medications must be an array');
  }
  return value as PrescribedMedication[];
}

function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new SoapValidationError(
      `${field} must be one of: ${allowed.join(', ')}`
    );
  }
  return value as T;
}

/**
 * Build a snake_case soap_notes upsert payload from a camelCase API body.
 *
 * - `consultation_id` and `vet_id` are always set from the trusted server-side
 *   values, never from the request body.
 * - `partial: true` (PATCH/autosave) → only fields present in `body` are
 *   included, so an autosave can send deltas without wiping other fields.
 * - `partial: false` (POST) → every known field is written (missing → null /
 *   [] / {} / false defaults), producing a complete document.
 *
 * Throws SoapValidationError on bad enum / shape input (route → 400).
 */
export function buildSoapNoteUpsert(
  body: Record<string, unknown>,
  consultationId: string,
  vetId: string,
  options: { partial: boolean }
): SoapNoteInsert {
  const { partial } = options;
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  const row: Record<string, unknown> = {
    consultation_id: consultationId,
    vet_id: vetId,
  };

  for (const [camel, snake] of Object.entries(TEXT_FIELDS)) {
    if (!partial || has(camel)) {
      row[snake] = textOrNull(body[camel]);
    }
  }

  if (!partial || has('vitalSigns')) {
    row.vital_signs = validateVitalSigns(body.vitalSigns);
  }
  if (!partial || has('referencedMediaUrls')) {
    row.referenced_media_urls = stringArray(body.referencedMediaUrls, 'referencedMediaUrls');
  }
  if (!partial || has('differentialDiagnoses')) {
    row.differential_diagnoses = stringArray(body.differentialDiagnoses, 'differentialDiagnoses');
  }
  if (!partial || has('confidenceLevel')) {
    row.confidence_level = validateEnum(body.confidenceLevel, CONFIDENCE_LEVELS, 'confidenceLevel');
  }
  if (!partial || has('medications')) {
    row.medications = validateMedications(body.medications);
  }
  if (!partial || has('inPersonVisitRecommended')) {
    row.in_person_visit_recommended = Boolean(body.inPersonVisitRecommended);
  }
  if (!partial || has('inPersonUrgency')) {
    row.in_person_urgency = validateEnum(body.inPersonUrgency, IN_PERSON_URGENCIES, 'inPersonUrgency');
  }

  return row as unknown as SoapNoteInsert;
}

/**
 * Map a soap_notes DB row (snake_case) to the camelCase SoapNote interface.
 * Defaults match the inline mapping in consultationMapper.ts.
 */
export function mapSoapNoteFromDB(row: SoapNoteRow): SoapNote {
  return {
    id: row.id,
    consultationId: row.consultation_id,
    vetId: row.vet_id,
    chiefComplaint: row.chief_complaint,
    historyPresentIllness: row.history_present_illness,
    behaviorChanges: row.behavior_changes,
    appetiteChanges: row.appetite_changes,
    activityLevelChanges: row.activity_level_changes,
    dietInfo: row.diet_info,
    previousTreatments: row.previous_treatments,
    environmentalFactors: row.environmental_factors,
    otherPetsHousehold: row.other_pets_household,
    generalAppearance: row.general_appearance,
    bodyConditionScore: row.body_condition_score,
    visiblePhysicalFindings: row.visible_physical_findings,
    respiratoryPattern: row.respiratory_pattern,
    gaitMobility: row.gait_mobility,
    vitalSigns: (row.vital_signs as VitalSigns | null) ?? null,
    referencedMediaUrls: row.referenced_media_urls ?? [],
    provisionalDiagnosis: row.provisional_diagnosis,
    differentialDiagnoses: row.differential_diagnoses ?? [],
    confidenceLevel: row.confidence_level as SoapNote['confidenceLevel'],
    teleconsultationLimitations: row.teleconsultation_limitations,
    medications: (row.medications as PrescribedMedication[] | null) ?? [],
    dietaryRecommendations: row.dietary_recommendations,
    lifestyleModifications: row.lifestyle_modifications,
    homeCareInstructions: row.home_care_instructions,
    warningSigns: row.warning_signs,
    followUpTimeframe: row.follow_up_timeframe,
    inPersonVisitRecommended: row.in_person_visit_recommended ?? false,
    inPersonUrgency: row.in_person_urgency as SoapNote['inPersonUrgency'],
    referralSpecialist: row.referral_specialist,
    additionalDiagnostics: row.additional_diagnostics,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}
