import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DIAGNOSES } from '@/lib/data/diagnoses';
import { MEDICATIONS } from '@/lib/data/medications';
import type { PrescribedMedication } from '@/types';

interface CaptureRequest {
  consultationId: string;
  isDiagnosisFromList?: boolean;
}

/**
 * POST /api/analytics/capture-treatment
 *
 * Called after consultation completion to capture treatment data for:
 * 1. Vet prescribing patterns (species-aware autocomplete)
 * 2. Consultation treatment records (AI/ML training data)
 *
 * Non-blocking — failure here should never prevent consultation completion.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authenticated user is a vet
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CaptureRequest;

    if (!body.consultationId) {
      return NextResponse.json(
        { error: 'Consultation ID required', code: 'MISSING_CONSULTATION_ID' },
        { status: 400 }
      );
    }

    // Fetch consultation details
    const { data: consultation, error: consultError } = await supabaseAdmin
      .from('consultations')
      .select('id, customer_id, vet_id, pet_id, concern_text, symptom_categories, outcome')
      .eq('id', body.consultationId)
      .single();

    if (consultError || !consultation) {
      console.error('Failed to fetch consultation for analytics:', consultError);
      return NextResponse.json(
        { error: 'Consultation not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify the requesting user is the vet for this consultation
    if (consultation.vet_id !== user.id) {
      return NextResponse.json(
        { error: 'Not the vet for this consultation', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Fetch pet snapshot
    const { data: pet } = await supabaseAdmin
      .from('pets')
      .select('id, species, breed, weight_kg, date_of_birth, approximate_age_months, gender, is_neutered, known_allergies, existing_conditions')
      .eq('id', consultation.pet_id)
      .single();

    if (!pet) {
      console.error('Pet not found for analytics capture');
      return NextResponse.json({ error: 'Pet not found', code: 'PET_NOT_FOUND' }, { status: 404 });
    }

    // Calculate pet age in months
    let petAgeMonths: number | null = pet.approximate_age_months;
    if (!petAgeMonths && pet.date_of_birth) {
      const dob = new Date(pet.date_of_birth);
      const now = new Date();
      petAgeMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    }

    // Fetch SOAP notes
    const { data: soapNotes } = await supabaseAdmin
      .from('soap_notes')
      .select('*')
      .eq('consultation_id', body.consultationId)
      .single();

    if (!soapNotes) {
      console.error('SOAP notes not found for analytics capture');
      return NextResponse.json({ error: 'SOAP notes not found', code: 'NOTES_NOT_FOUND' }, { status: 404 });
    }

    const medications = (soapNotes.medications || []) as PrescribedMedication[];
    const diagnosis = soapNotes.provisional_diagnosis as string;

    if (!diagnosis || medications.length === 0) {
      // No medications to capture — still valid, just nothing to record
      return NextResponse.json({ success: true, recordsCreated: 0 });
    }

    // Determine diagnosis category by matching against known diagnoses
    const knownDiagnosis = DIAGNOSES.find(
      (d) => d.name.toLowerCase() === diagnosis.toLowerCase()
    );
    const diagnosisCategory = knownDiagnosis?.category || null;

    // Process each medication
    let recordsCreated = 0;

    for (const med of medications) {
      if (!med.name) continue;

      // 1. UPSERT vet_prescribing_patterns (via authenticated client — RLS allows vet to write own)
      const { error: patternError } = await supabase
        .from('vet_prescribing_patterns')
        .upsert(
          {
            vet_id: user.id,
            pet_species: pet.species,
            diagnosis,
            medication_name: med.name,
            dosage: med.dosage || null,
            route: med.route || null,
            frequency: med.frequency || null,
            duration: med.duration || null,
            last_used_at: new Date().toISOString(),
          },
          {
            onConflict: 'vet_id,pet_species,diagnosis,medication_name',
          }
        );

      if (patternError) {
        console.error('Failed to upsert prescribing pattern:', patternError);
      } else {
        // Increment use_count — upsert doesn't support increment, so do a separate update
        try {
          await supabase.rpc('increment_prescribing_use_count' as never, {
            p_vet_id: user.id,
            p_species: pet.species,
            p_diagnosis: diagnosis,
            p_medication: med.name,
          } as never);
        } catch {
          // RPC not set up — use_count stays at 1 for new records
        }
      }

      // Determine medication category
      const knownMed = MEDICATIONS.find(
        (m) => m.name.toLowerCase() === med.name.toLowerCase()
      );
      const medicationCategory = knownMed?.category || null;

      // 2. INSERT consultation_treatment_records (via admin client — service role)
      const { error: recordError } = await supabaseAdmin
        .from('consultation_treatment_records')
        .insert({
          consultation_id: body.consultationId,
          vet_id: user.id,
          pet_id: pet.id,
          pet_species: pet.species,
          pet_breed: pet.breed || null,
          pet_weight_kg: pet.weight_kg || null,
          pet_age_months: petAgeMonths,
          pet_gender: pet.gender || null,
          pet_is_neutered: pet.is_neutered,
          pet_known_allergies: pet.known_allergies || [],
          pet_existing_conditions: pet.existing_conditions || [],
          chief_complaint: soapNotes.chief_complaint || consultation.concern_text || null,
          symptom_categories: consultation.symptom_categories || [],
          provisional_diagnosis: diagnosis,
          differential_diagnoses: soapNotes.differential_diagnoses || [],
          diagnosis_category: diagnosisCategory,
          confidence_level: soapNotes.confidence_level || null,
          is_diagnosis_from_list: body.isDiagnosisFromList ?? false,
          medication_name: med.name,
          medication_category: medicationCategory,
          dosage: med.dosage || null,
          route: med.route || null,
          frequency: med.frequency || null,
          duration: med.duration || null,
          instructions: med.instructions || null,
          is_medication_from_list: med.isFromList ?? false,
          vital_signs: soapNotes.vital_signs || null,
          body_condition_score: soapNotes.body_condition_score || null,
          consultation_outcome: consultation.outcome || 'success',
          follow_up_required: !!soapNotes.follow_up_timeframe,
          in_person_visit_recommended: soapNotes.in_person_visit_recommended || false,
          in_person_urgency: soapNotes.in_person_urgency || null,
        });

      if (recordError) {
        console.error('Failed to insert treatment record:', recordError);
      } else {
        recordsCreated++;
      }
    }

    return NextResponse.json({ success: true, recordsCreated });
  } catch (error) {
    console.error('Error in capture-treatment:', error);
    return NextResponse.json(
      { error: 'Internal error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
