/**
 * Server-side helper that loads all the data needed to render a Treatment
 * Plan draft for a given consultation: consultation, pet, owner, vet
 * profile, and the SOAP note that the plan is built on.
 *
 * Used by the GET/POST/PATCH/finalize Treatment Plan routes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { TreatmentPlanHeader } from './types';
import { parseTreatmentPlanDraft, type TreatmentPlanDraft } from './schemas';

export interface TreatmentPlanContextOk {
  ok: true;
  consultation: {
    id: string;
    customer_id: string;
    vet_id: string;
    pet_id: string;
    scheduled_at: string | null;
    created_at: string;
  };
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    date_of_birth: string | null;
    approximate_age_months: number | null;
    weight_kg: number | null;
  };
  owner: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
  vet: {
    id: string;
    full_name: string | null;
  };
  vetProfile: {
    qualifications: string | null;
    vci_registration_number: string | null;
    specializations: string[] | null;
  } | null;
  soapNote: SoapNote | null;
  header: TreatmentPlanHeader;
}

export interface TreatmentPlanContextErr {
  ok: false;
  status: number;
  error: string;
  code: string;
}

export type TreatmentPlanContext =
  | TreatmentPlanContextOk
  | TreatmentPlanContextErr;

export interface SoapNote {
  id: string;
  provisional_diagnosis: string | null;
  differential_diagnoses: string[] | null;
  medications: unknown;
  dietary_recommendations: string | null;
  lifestyle_modifications: string | null;
  home_care_instructions: string | null;
  warning_signs: string | null;
  follow_up_timeframe: string | null;
  in_person_visit_recommended: boolean | null;
  in_person_urgency: string | null;
  referral_specialist: string | null;
  additional_diagnostics: string | null;
  vital_signs: { weight?: number | string } | null;
}

/**
 * Fetches consultation, pet, owner, vet, vet profile and SOAP note.
 * Verifies vet ownership of the consultation. Returns a tagged
 * `{ ok: true, ... }` or `{ ok: false, status, error, code }` result so
 * callers can short-circuit cleanly.
 */
export async function loadTreatmentPlanContext(
  supabase: SupabaseClient<Database>,
  vetUserId: string,
  consultationId: string
): Promise<TreatmentPlanContext> {
  const { data: consultation, error: cErr } = await supabase
    .from('consultations')
    .select(
      `
      id,
      customer_id,
      vet_id,
      pet_id,
      scheduled_at,
      created_at,
      pets!consultations_pet_id_fkey (
        id, name, species, breed, date_of_birth, approximate_age_months, weight_kg
      ),
      profiles!consultations_customer_id_fkey (
        id, full_name, email, phone
      )
    `
    )
    .eq('id', consultationId)
    .eq('vet_id', vetUserId)
    .maybeSingle();

  if (cErr || !consultation) {
    return {
      ok: false,
      status: 404,
      error: 'Consultation not found',
      code: 'CONSULTATION_NOT_FOUND',
    };
  }

  const pet = Array.isArray(consultation.pets)
    ? consultation.pets[0]
    : consultation.pets;
  const owner = Array.isArray(consultation.profiles)
    ? consultation.profiles[0]
    : consultation.profiles;

  if (!pet || !owner) {
    return {
      ok: false,
      status: 500,
      error: 'Consultation is missing pet or owner data',
      code: 'INCOMPLETE_CONSULTATION',
    };
  }

  const { data: vetProfileRow } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', vetUserId)
    .single();

  const { data: vetProfile } = await supabase
    .from('vet_profiles')
    .select('qualifications, vci_registration_number, specializations')
    .eq('id', vetUserId)
    .maybeSingle();

  const { data: soapNoteRow } = await supabase
    .from('soap_notes')
    .select(
      `id, provisional_diagnosis, differential_diagnoses, medications,
       dietary_recommendations, lifestyle_modifications, home_care_instructions,
       warning_signs, follow_up_timeframe, in_person_visit_recommended,
       in_person_urgency, referral_specialist, additional_diagnostics, vital_signs`
    )
    .eq('consultation_id', consultationId)
    .maybeSingle();

  const soapNote = (soapNoteRow as SoapNote | null) ?? null;

  const header: TreatmentPlanHeader = {
    vet: {
      name: vetProfileRow?.full_name ?? 'Furrie Veterinarian',
      vciNumber: vetProfile?.vci_registration_number ?? null,
      qualifications: vetProfile?.qualifications ?? null,
      specializations: Array.isArray(vetProfile?.specializations)
        ? vetProfile!.specializations!.join(', ')
        : null,
    },
    pet: {
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? null,
      ageDisplay: formatPetAge(pet),
      weight: formatPetWeight(pet, soapNote),
    },
    owner: {
      name: owner.full_name ?? 'Pet Parent',
      phone: owner.phone ?? null,
    },
    consultationDate:
      consultation.scheduled_at ?? consultation.created_at ?? new Date().toISOString(),
  };

  return {
    ok: true,
    consultation: {
      id: consultation.id,
      customer_id: consultation.customer_id,
      vet_id: consultation.vet_id!,
      pet_id: consultation.pet_id,
      scheduled_at: consultation.scheduled_at ?? null,
      created_at: consultation.created_at ?? new Date().toISOString(),
    },
    pet: {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? null,
      date_of_birth: pet.date_of_birth ?? null,
      approximate_age_months: pet.approximate_age_months ?? null,
      weight_kg: pet.weight_kg ?? null,
    },
    owner: {
      id: owner.id,
      full_name: owner.full_name ?? null,
      email: owner.email ?? null,
      phone: owner.phone ?? null,
    },
    vet: {
      id: vetUserId,
      full_name: vetProfileRow?.full_name ?? null,
    },
    vetProfile: vetProfile
      ? {
          qualifications: vetProfile.qualifications ?? null,
          vci_registration_number: vetProfile.vci_registration_number ?? null,
          specializations: (vetProfile.specializations as string[] | null) ?? null,
        }
      : null,
    soapNote,
    header,
  };
}

/**
 * Build an initial draft from a SOAP note. Called when a consultation has
 * no prescriptions row yet — copies the relevant SOAP fields into the
 * section-oriented draft shape so the vet starts with a populated plan.
 */
export function buildDraftFromSoap(soap: SoapNote | null): TreatmentPlanDraft {
  if (!soap) return parseTreatmentPlanDraft({});

  return parseTreatmentPlanDraft({
    observations: soap.additional_diagnostics ?? '',
    diagnosis: soap.provisional_diagnosis ?? '',
    lab_tests: [],
    medications: Array.isArray(soap.medications) ? soap.medications : [],
    diet_nutrition: soap.dietary_recommendations ?? '',
    home_care: [soap.lifestyle_modifications, soap.home_care_instructions]
      .filter(Boolean)
      .join('\n\n'),
    warning_signs: soap.warning_signs ?? '',
    follow_up: {
      timeframe: soap.follow_up_timeframe ?? '',
      mode: soap.in_person_visit_recommended ? 'in_person' : 'teleconsult',
      notes: soap.in_person_urgency ?? '',
    },
    in_person_advisory: soap.in_person_visit_recommended
      ? `In-person visit recommended${soap.in_person_urgency ? ` (${soap.in_person_urgency})` : ''}${soap.referral_specialist ? `. Referral: ${soap.referral_specialist}` : ''}`
      : '',
    custom_sections: [],
  });
}

// ----------------------------------------------------------------------------
// Formatting helpers (shared with the PDF renderer and builder)
// ----------------------------------------------------------------------------

function formatPetAge(pet: {
  date_of_birth: string | null;
  approximate_age_months: number | null;
}): string {
  if (pet.date_of_birth) {
    const birth = new Date(pet.date_of_birth);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    const adjustedMonths = months < 0 ? months + 12 : months;
    const adjustedYears = months < 0 ? years - 1 : years;
    if (adjustedYears > 0) {
      const y = `${adjustedYears} year${adjustedYears === 1 ? '' : 's'}`;
      return adjustedMonths > 0
        ? `${y} ${adjustedMonths} month${adjustedMonths === 1 ? '' : 's'}`
        : y;
    }
    if (adjustedMonths > 0) {
      return `${adjustedMonths} month${adjustedMonths === 1 ? '' : 's'}`;
    }
    return 'Under 1 month';
  }
  if (pet.approximate_age_months && pet.approximate_age_months > 0) {
    const m = pet.approximate_age_months;
    if (m >= 12) {
      const years = Math.floor(m / 12);
      const remaining = m % 12;
      return remaining > 0
        ? `${years} year${years === 1 ? '' : 's'} ${remaining} month${remaining === 1 ? '' : 's'}`
        : `${years} year${years === 1 ? '' : 's'}`;
    }
    return `${m} month${m === 1 ? '' : 's'}`;
  }
  return 'Unknown';
}

function formatPetWeight(
  pet: { weight_kg: number | null },
  soap: SoapNote | null
): string | null {
  if (pet.weight_kg) return `${pet.weight_kg} kg`;
  const soapWeight = soap?.vital_signs?.weight;
  if (soapWeight != null && soapWeight !== '') return `${soapWeight} kg`;
  return null;
}
