import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { SOAPForm } from '@/components/vet/SOAPForm';
import type { SoapNote } from '@/types';

export const metadata: Metadata = {
  title: 'SOAP Notes - Vet Portal',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VetSoapNotesPage({ params }: PageProps) {
  const { id: consultationId } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/vet-portal/login');
  }

  // Verify user is a vet
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'vet') {
    redirect('/vet-portal/login?error=wrong_account');
  }

  // Fetch consultation with pet details
  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select(`
      *,
      pets!consultations_pet_id_fkey (
        id,
        name,
        species,
        breed,
        photo_urls
      ),
      profiles!consultations_customer_id_fkey (
        id,
        full_name
      )
    `)
    .eq('id', consultationId)
    .eq('vet_id', user.id)
    .single();

  if (consultationError || !consultation) {
    notFound();
  }

  // Fetch existing SOAP notes if any
  const { data: existingSoapNote } = await supabase
    .from('soap_notes')
    .select('*')
    .eq('consultation_id', consultationId)
    .single();

  // Map SOAP note to TypeScript interface
  const soapNoteData: Partial<SoapNote> | undefined = existingSoapNote
    ? {
        id: existingSoapNote.id,
        consultationId: existingSoapNote.consultation_id,
        vetId: existingSoapNote.vet_id,
        chiefComplaint: existingSoapNote.chief_complaint,
        historyPresentIllness: existingSoapNote.history_present_illness,
        behaviorChanges: existingSoapNote.behavior_changes,
        appetiteChanges: existingSoapNote.appetite_changes,
        activityLevelChanges: existingSoapNote.activity_level_changes,
        dietInfo: existingSoapNote.diet_info,
        previousTreatments: existingSoapNote.previous_treatments,
        environmentalFactors: existingSoapNote.environmental_factors,
        otherPetsHousehold: existingSoapNote.other_pets_household,
        generalAppearance: existingSoapNote.general_appearance,
        bodyConditionScore: existingSoapNote.body_condition_score,
        visiblePhysicalFindings: existingSoapNote.visible_physical_findings,
        respiratoryPattern: existingSoapNote.respiratory_pattern,
        gaitMobility: existingSoapNote.gait_mobility,
        vitalSigns: existingSoapNote.vital_signs,
        referencedMediaUrls: existingSoapNote.referenced_media_urls || [],
        provisionalDiagnosis: existingSoapNote.provisional_diagnosis,
        differentialDiagnoses: existingSoapNote.differential_diagnoses || [],
        confidenceLevel: existingSoapNote.confidence_level,
        teleconsultationLimitations: existingSoapNote.teleconsultation_limitations,
        medications: existingSoapNote.medications || [],
        dietaryRecommendations: existingSoapNote.dietary_recommendations,
        lifestyleModifications: existingSoapNote.lifestyle_modifications,
        homeCareInstructions: existingSoapNote.home_care_instructions,
        warningSigns: existingSoapNote.warning_signs,
        followUpTimeframe: existingSoapNote.follow_up_timeframe,
        inPersonVisitRecommended: existingSoapNote.in_person_visit_recommended,
        inPersonUrgency: existingSoapNote.in_person_urgency,
        referralSpecialist: existingSoapNote.referral_specialist,
        additionalDiagnostics: existingSoapNote.additional_diagnostics,
        createdAt: existingSoapNote.created_at,
        updatedAt: existingSoapNote.updated_at,
      }
    : undefined;

  const pet = consultation.pets;
  const customer = consultation.profiles;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Consultation Context */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link
            href={`/consultations/${consultationId}`}
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-link)',
              marginBottom: 'var(--space-2)',
              display: 'inline-block',
            }}
          >
            Back to Consultation
          </Link>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600 }}>
            SOAP Notes
          </h1>
        </div>
      </div>

      {/* Pet/Patient Info Card */}
      <Card>
        <CardContent>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--font-size-xl)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
            }}>
              {pet?.species === 'dog' ? 'D' : 'C'}
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                {pet?.name || 'Unknown Pet'}
              </h2>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {pet?.species === 'dog' ? 'Dog' : 'Cat'} - {pet?.breed || 'Unknown breed'}
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                Pet Parent: {customer?.full_name || 'Unknown'}
              </p>
            </div>
            {consultation.concern_text && (
              <div style={{
                marginLeft: 'auto',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                maxWidth: '300px',
              }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-1)' }}>
                  Chief Concern
                </p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                  {consultation.concern_text}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SOAP Form */}
      <Card>
        <CardContent>
          <SOAPForm
            consultationId={consultationId}
            vetId={user.id}
            petSpecies={pet?.species || 'dog'}
            initialData={soapNoteData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
