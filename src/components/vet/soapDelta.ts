/**
 * Which SOAP fields to send on a save (C-01).
 *
 * The form keeps a baseline — the values last loaded from or saved to the
 * server — and only fields that differ from it are sent to
 * PATCH /api/consultations/[id]/soap-notes, which writes only the keys it
 * receives. A form that somehow opened blank can therefore never wipe fields
 * the vet did not touch.
 *
 * Autosave is stricter still: it never turns a filled field into an empty one.
 * Clearing a field is saved only by an explicit save (Save Draft / Complete).
 */

export const SOAP_FIELDS = [
  'chiefComplaint',
  'historyPresentIllness',
  'behaviorChanges',
  'appetiteChanges',
  'activityLevelChanges',
  'dietInfo',
  'previousTreatments',
  'environmentalFactors',
  'otherPetsHousehold',
  'generalAppearance',
  'bodyConditionScore',
  'visiblePhysicalFindings',
  'respiratoryPattern',
  'gaitMobility',
  'vitalSigns',
  'referencedMediaUrls',
  'provisionalDiagnosis',
  'differentialDiagnoses',
  'confidenceLevel',
  'teleconsultationLimitations',
  'medications',
  'dietaryRecommendations',
  'lifestyleModifications',
  'homeCareInstructions',
  'warningSigns',
  'followUpTimeframe',
  'inPersonVisitRecommended',
  'inPersonUrgency',
  'referralSpecialist',
  'additionalDiagnostics',
] as const;

export type SoapField = (typeof SOAP_FIELDS)[number];
export type SoapValues = Record<SoapField, unknown>;

/** True for values that carry no content. Booleans always count as content. */
export function isEmptySoapValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(
      (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
    );
  }
  return false;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function buildSoapDelta(
  current: SoapValues,
  baseline: SoapValues,
  options: { autosave: boolean }
): { delta: Partial<SoapValues>; heldBack: SoapField[] } {
  const delta: Partial<SoapValues> = {};
  const heldBack: SoapField[] = [];

  for (const field of SOAP_FIELDS) {
    const next = current[field];
    const saved = baseline[field];
    if (sameValue(next, saved)) continue;

    if (options.autosave && isEmptySoapValue(next) && !isEmptySoapValue(saved)) {
      heldBack.push(field);
      continue;
    }
    delta[field] = next;
  }

  return { delta, heldBack };
}

/** True when the form holds anything that differs from the baseline. */
export function hasSoapChanges(current: SoapValues, baseline: SoapValues): boolean {
  return SOAP_FIELDS.some((field) => !sameValue(current[field], baseline[field]));
}
