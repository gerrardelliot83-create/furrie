import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { FlagButton } from '@/components/vet/FlagButton';
import { ConsultationDetailTabs } from '@/components/vet/ConsultationDetailTabs';
import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
import type { ConsultationStatus, ConsultationOutcome, SoapNote } from '@/types';
import styles from './page.module.css';

// Force dynamic rendering to always get fresh data
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Consultation Details - Vet Portal`,
    description: `View consultation ${id}`,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function calculateAge(dateOfBirth: string | null, approximateAgeMonths: number | null): string {
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const years = now.getFullYear() - dob.getFullYear();
    const months = now.getMonth() - dob.getMonth();
    const totalMonths = years * 12 + months;

    if (totalMonths < 12) {
      return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
    }
    const yrs = Math.floor(totalMonths / 12);
    return `${yrs} year${yrs !== 1 ? 's' : ''}`;
  }
  if (approximateAgeMonths) {
    if (approximateAgeMonths < 12) {
      return `~${approximateAgeMonths} month${approximateAgeMonths !== 1 ? 's' : ''}`;
    }
    const yrs = Math.floor(approximateAgeMonths / 12);
    return `~${yrs} year${yrs !== 1 ? 's' : ''}`;
  }
  return 'Unknown';
}

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return '-';
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  return `${diffMins} minutes`;
}

interface MedicationJson {
  name?: string;
  dosage?: string;
  frequency?: string;
}

export default async function VetConsultationDetailPage({ params }: PageProps) {
  const { id: consultationId } = await params;
  const t = await getTranslations('consultation');

  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Verify user is a vet
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'vet') {
    redirect('/login?error=wrong_account');
  }

  // Fetch consultation with all related data (expanded pet fields for sidebar)
  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select(`
      *,
      pets!consultations_pet_id_fkey (
        id,
        name,
        species,
        breed,
        date_of_birth,
        approximate_age_months,
        weight_kg,
        gender,
        is_neutered,
        known_allergies,
        existing_conditions,
        current_medications,
        photo_urls
      ),
      profiles!consultations_customer_id_fkey (
        id,
        full_name,
        email,
        phone
      ),
      soap_notes (
        id,
        chief_complaint,
        history_present_illness,
        behavior_changes,
        appetite_changes,
        activity_level_changes,
        diet_info,
        previous_treatments,
        environmental_factors,
        other_pets_household,
        general_appearance,
        body_condition_score,
        visible_physical_findings,
        respiratory_pattern,
        gait_mobility,
        vital_signs,
        referenced_media_urls,
        provisional_diagnosis,
        differential_diagnoses,
        confidence_level,
        teleconsultation_limitations,
        medications,
        dietary_recommendations,
        lifestyle_modifications,
        home_care_instructions,
        warning_signs,
        follow_up_timeframe,
        in_person_visit_recommended,
        in_person_urgency,
        referral_specialist,
        additional_diagnostics,
        created_at,
        updated_at
      ),
      prescriptions (
        id
      ),
      consultation_ratings (
        rating,
        feedback_text
      ),
      consultation_flags (
        id,
        reason,
        details
      )
    `)
    .eq('id', consultationId)
    .eq('vet_id', user.id)
    .single();

  if (consultationError || !consultation) {
    notFound();
  }

  // Parallel fetch: follow-up thread, media, patient history
  const petId = consultation.pets?.id;
  const [
    followUpResult,
    mediaResult,
    pastConsultationsResult,
  ] = await Promise.all([
    // Follow-up thread
    supabase
      .from('follow_up_threads')
      .select('id, is_active, expires_at')
      .eq('consultation_id', consultationId)
      .single(),
    // Consultation media
    supabase
      .from('consultation_media')
      .select('id, url, media_type, file_name, file_size_bytes, created_at')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: true }),
    // Past consultations for same pet (exclude current)
    petId
      ? supabase
          .from('consultations')
          .select(`
            id,
            consultation_number,
            status,
            outcome,
            created_at,
            scheduled_at,
            profiles!consultations_vet_id_fkey (full_name),
            soap_notes (provisional_diagnosis)
          `)
          .eq('pet_id', petId)
          .neq('id', consultationId)
          .in('status', ['closed'])
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: null }),
  ]);

  const followUpThread = followUpResult.data;
  const hasFollowUpAccess = !!followUpThread && followUpThread.is_active;
  const isThreadExpired = followUpThread?.expires_at
    ? new Date(followUpThread.expires_at) < new Date()
    : false;

  const mediaData = mediaResult.data;
  const pastConsultations = pastConsultationsResult.data;

  const pet = consultation.pets;
  const customer = consultation.profiles;
  const soapNoteRaw = consultation.soap_notes?.[0];
  const hasSoapNotes = !!soapNoteRaw;
  const rating = consultation.consultation_ratings?.[0];
  const flag = consultation.consultation_flags?.[0];
  const isActive = ['scheduled', 'active'].includes(consultation.status);
  const isCompleted = consultation.status === 'closed';

  // Map SOAP note for the SOAPForm initial data
  const soapNoteData: Partial<SoapNote> | undefined = soapNoteRaw
    ? {
        id: soapNoteRaw.id,
        consultationId: consultationId,
        vetId: user.id,
        chiefComplaint: soapNoteRaw.chief_complaint,
        historyPresentIllness: soapNoteRaw.history_present_illness,
        behaviorChanges: soapNoteRaw.behavior_changes,
        appetiteChanges: soapNoteRaw.appetite_changes,
        activityLevelChanges: soapNoteRaw.activity_level_changes,
        dietInfo: soapNoteRaw.diet_info,
        previousTreatments: soapNoteRaw.previous_treatments,
        environmentalFactors: soapNoteRaw.environmental_factors,
        otherPetsHousehold: soapNoteRaw.other_pets_household,
        generalAppearance: soapNoteRaw.general_appearance,
        bodyConditionScore: soapNoteRaw.body_condition_score,
        visiblePhysicalFindings: soapNoteRaw.visible_physical_findings,
        respiratoryPattern: soapNoteRaw.respiratory_pattern,
        gaitMobility: soapNoteRaw.gait_mobility,
        vitalSigns: soapNoteRaw.vital_signs as SoapNote['vitalSigns'],
        referencedMediaUrls: soapNoteRaw.referenced_media_urls || [],
        provisionalDiagnosis: soapNoteRaw.provisional_diagnosis,
        differentialDiagnoses: soapNoteRaw.differential_diagnoses || [],
        confidenceLevel: soapNoteRaw.confidence_level,
        teleconsultationLimitations: soapNoteRaw.teleconsultation_limitations,
        medications: soapNoteRaw.medications as SoapNote['medications'],
        dietaryRecommendations: soapNoteRaw.dietary_recommendations,
        lifestyleModifications: soapNoteRaw.lifestyle_modifications,
        homeCareInstructions: soapNoteRaw.home_care_instructions,
        warningSigns: soapNoteRaw.warning_signs,
        followUpTimeframe: soapNoteRaw.follow_up_timeframe,
        inPersonVisitRecommended: soapNoteRaw.in_person_visit_recommended,
        inPersonUrgency: soapNoteRaw.in_person_urgency,
        referralSpecialist: soapNoteRaw.referral_specialist,
        additionalDiagnostics: soapNoteRaw.additional_diagnostics,
        createdAt: soapNoteRaw.created_at,
        updatedAt: soapNoteRaw.updated_at,
      }
    : undefined;

  // Parse pet medications from JSON
  const petMedications: MedicationJson[] = Array.isArray(pet?.current_medications)
    ? (pet.current_medications as MedicationJson[])
    : [];

  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  const displayDate = consultation.scheduled_at
    ? new Date(consultation.scheduled_at)
    : new Date(consultation.created_at);
  const hasScheduledTime = !!consultation.scheduled_at;

  // Build overview content that will be passed to the tabs component
  const overviewContent = (
    <>
      {/* Chief Concern */}
      {consultation.concern_text && (
        <div className={styles.overviewSection}>
          <h3 className={styles.overviewSectionTitle}>Chief Concern</h3>
          <div className={styles.concernText}>
            {consultation.concern_text}
          </div>
          {consultation.symptom_categories && consultation.symptom_categories.length > 0 && (
            <div className={styles.symptoms}>
              {consultation.symptom_categories.map((symptom: string) => (
                <Badge key={symptom} variant="neutral">
                  {symptom}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer Media */}
      {mediaData && mediaData.length > 0 && (
        <div className={styles.overviewSection}>
          <h3 className={styles.overviewSectionTitle}>Customer Media</h3>
          {mediaData.filter((m) => m.media_type === 'photo').length > 0 && (
            <div className={styles.mediaGallery}>
              {mediaData
                .filter((m) => m.media_type === 'photo')
                .map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mediaThumb}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={m.file_name || 'Consultation photo'}
                      className={styles.mediaThumbImage}
                    />
                  </a>
                ))}
            </div>
          )}
          {mediaData.filter((m) => m.media_type === 'video').length > 0 && (
            <div className={styles.mediaVideos}>
              {mediaData
                .filter((m) => m.media_type === 'video')
                .map((m) => (
                  <div key={m.id} className={styles.mediaVideoItem}>
                    <video
                      src={m.url}
                      controls
                      preload="metadata"
                      className={styles.mediaVideoPlayer}
                    />
                    {m.file_name && (
                      <span className={styles.mediaVideoName}>{m.file_name}</span>
                    )}
                  </div>
                ))}
            </div>
          )}
          {mediaData.filter((m) => m.media_type === 'document').length > 0 && (
            <div className={styles.mediaDocuments}>
              {mediaData
                .filter((m) => m.media_type === 'document')
                .map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mediaDocumentLink}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {m.file_name || 'Document'}
                  </a>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Patient History */}
      {pastConsultations && pastConsultations.length > 0 && (
        <div className={styles.overviewSection}>
          <h3 className={styles.overviewSectionTitle}>Patient History</h3>
          <div className={styles.historyList}>
            {pastConsultations.map((past) => {
              const pastDate = past.scheduled_at || past.created_at;
              const diagnosis = past.soap_notes?.[0]?.provisional_diagnosis;
              const vetProfile = Array.isArray(past.profiles) ? past.profiles[0] : past.profiles;
              const vetName = vetProfile?.full_name;
              return (
                <Link
                  key={past.id}
                  href={`/consultations/${past.id}`}
                  className={styles.historyItem}
                >
                  <span className={styles.historyDate} suppressHydrationWarning>
                    {dateFormatter.format(new Date(pastDate))}
                  </span>
                  <div className={styles.historyInfo}>
                    <span className={styles.historyDiagnosis}>
                      {diagnosis || 'No diagnosis recorded'}
                    </span>
                    {vetName && (
                      <span className={styles.historyVet}>Dr. {vetName}</span>
                    )}
                  </div>
                  <div className={styles.historyOutcome}>
                    <Badge
                      variant={getStatusVariant(
                        past.status as ConsultationStatus,
                        past.outcome as ConsultationOutcome | null
                      )}
                      size="sm"
                    >
                      {getStatusDisplayText(
                        past.status as ConsultationStatus,
                        past.outcome as ConsultationOutcome | null
                      )}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Consultation Details */}
      <div className={styles.overviewSection}>
        <h3 className={styles.overviewSectionTitle}>Consultation Details</h3>
        <div className={styles.detailsList}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>
              {hasScheduledTime ? 'Scheduled Date' : 'Date'}
            </span>
            <span className={styles.detailValue} suppressHydrationWarning>
              {dateFormatter.format(displayDate)}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>
              {hasScheduledTime ? 'Scheduled Time' : 'Time'}
            </span>
            <span className={styles.detailValue} suppressHydrationWarning>
              {timeFormatter.format(displayDate)}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Type</span>
            <span className={styles.detailValue}>
              {consultation.type === 'direct_connect' ? 'Direct Connect' :
               consultation.type === 'scheduled' ? 'Scheduled' : 'Follow-up'}
            </span>
          </div>
          {consultation.status === 'closed' && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Duration</span>
              <span className={styles.detailValue}>
                {formatDuration(consultation.started_at, consultation.ended_at)}
              </span>
            </div>
          )}
          {rating && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Rating</span>
              <span className={styles.ratingDisplay}>
                {'*'.repeat(rating.rating).split('').map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
                {rating.rating}/5
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recording link */}
      {consultation.recording_url && (
        <div className={styles.overviewSection}>
          <h3 className={styles.overviewSectionTitle}>Recording</h3>
          <a
            href={consultation.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mediaDocumentLink}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            View Recording
          </a>
        </div>
      )}
    </>
  );

  return (
    <div className={styles.container}>
      <Link href="/consultations" className={styles.backLink}>
        &larr; Back to Consultations
      </Link>

      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>{t('consultationDetails')}</h1>
          <Badge variant={getStatusVariant(consultation.status as ConsultationStatus, consultation.outcome as ConsultationOutcome | null)}>
            {getStatusDisplayText(consultation.status as ConsultationStatus, consultation.outcome as ConsultationOutcome | null)}
          </Badge>
        </div>
        <p className={styles.consultationNumber}>
          {consultation.consultation_number}
        </p>
      </div>

      <div className={styles.layout}>
        {/* ── Left Sidebar: Patient Context ── */}
        <aside className={styles.sidebar}>
          {/* Pet Info */}
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarCardTitle}>Patient</h2>
            <div className={styles.petHeader}>
              <div className={`${styles.petAvatar} ${pet?.photo_urls && pet.photo_urls.length > 0 ? (pet.species === 'dog' ? styles.petAvatarDog : styles.petAvatarCat) : ''}`}>
                {pet?.photo_urls && pet.photo_urls.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pet.photo_urls[0]}
                    alt={pet.name}
                    className={styles.petAvatarImage}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pet?.species === 'dog' ? '/assets/dog-avatar.png' : '/assets/cat-avatar.png'}
                    alt={pet?.species === 'dog' ? 'Dog' : 'Cat'}
                    className={styles.petAvatarImage}
                  />
                )}
              </div>
              <div>
                <h3 className={styles.petName}>{pet?.name || 'Unknown Pet'}</h3>
                <p className={styles.petSpecies}>
                  {pet?.species === 'dog' ? 'Dog' : 'Cat'} &middot; {pet?.breed || 'Unknown breed'}
                </p>
              </div>
            </div>
            <div className={styles.petVitals}>
              <div className={styles.vitalItem}>
                <span className={styles.vitalLabel}>Age</span>
                <span className={styles.vitalValue}>
                  {calculateAge(pet?.date_of_birth ?? null, pet?.approximate_age_months ?? null)}
                </span>
              </div>
              {pet?.weight_kg && (
                <div className={styles.vitalItem}>
                  <span className={styles.vitalLabel}>Weight</span>
                  <span className={styles.vitalValue}>{pet.weight_kg} kg</span>
                </div>
              )}
              <div className={styles.vitalItem}>
                <span className={styles.vitalLabel}>Gender</span>
                <span className={styles.vitalValue}>
                  {pet?.gender === 'male' ? 'Male' : 'Female'}
                </span>
              </div>
              <div className={styles.vitalItem}>
                <span className={styles.vitalLabel}>Neutered</span>
                <span className={styles.vitalValue}>
                  {pet?.is_neutered ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            <Link href={`/patients/${pet?.id}`} className={styles.viewPetLink}>
              View Full Profile
            </Link>
          </div>

          {/* Medical Context */}
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarCardTitle}>Medical Context</h2>

            <h4 className={styles.sidebarCardTitle} style={{ marginTop: 0, marginBottom: 'var(--space-2)' }}>
              Allergies
            </h4>
            {pet?.known_allergies && pet.known_allergies.length > 0 ? (
              <div className={styles.medicalList}>
                {pet.known_allergies.map((allergy: string) => (
                  <div key={allergy} className={styles.medicalItem}>
                    <span className={styles.medicalBullet} />
                    {allergy}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyNote}>None recorded</p>
            )}

            <h4 className={styles.sidebarCardTitle} style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              Conditions
            </h4>
            {pet?.existing_conditions && pet.existing_conditions.length > 0 ? (
              <div className={styles.medicalList}>
                {pet.existing_conditions.map((condition: string) => (
                  <div key={condition} className={styles.medicalItem}>
                    <span className={styles.medicalBullet} />
                    {condition}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyNote}>None recorded</p>
            )}

            <h4 className={styles.sidebarCardTitle} style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              Medications
            </h4>
            {petMedications.length > 0 ? (
              <div className={styles.medicalList}>
                {petMedications.map((med, i) => (
                  <div key={i} className={styles.medicalItem}>
                    <span className={styles.medicalBullet} />
                    {med.name}{med.dosage ? ` ${med.dosage}` : ''}{med.frequency ? ` (${med.frequency})` : ''}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyNote}>None recorded</p>
            )}
          </div>

          {/* Customer Info */}
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarCardTitle}>Pet Parent</h2>
            <h3 className={styles.customerName}>{customer?.full_name || 'Unknown'}</h3>
            {customer?.phone && (
              <p className={styles.customerContact}>{customer.phone}</p>
            )}
            {customer?.email && (
              <p className={styles.customerContact}>{customer.email}</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarCardTitle}>Quick Actions</h2>
            <div className={styles.quickActions}>
              {isActive && (
                <Link
                  href={`/consultations/${consultationId}/room`}
                  className={styles.quickActionWarning}
                >
                  Join Video Call
                </Link>
              )}

              {hasFollowUpAccess && !isThreadExpired ? (
                <Link
                  href={`/consultations/${consultationId}/follow-up`}
                  className={styles.quickActionLink}
                >
                  Follow-up Chat
                </Link>
              ) : hasSoapNotes ? (
                <span
                  className={styles.quickActionDisabled}
                  title={isThreadExpired ? 'Chat window has expired' : 'Follow-up chat is being created...'}
                >
                  Follow-up Chat{isThreadExpired ? ' (Expired)' : ''}
                </span>
              ) : (
                <span
                  className={styles.quickActionDisabled}
                  title="Complete SOAP notes first to enable follow-up chat"
                >
                  Follow-up Chat
                </span>
              )}

              {flag ? (
                <div className={styles.flagged}>
                  Flagged: {flag.reason.replace('_', ' ')}
                </div>
              ) : (
                <FlagButton consultationId={consultationId} className={styles.flagButton} />
              )}
            </div>
          </div>
        </aside>

        {/* ── Main Content: Tabbed Interface ── */}
        <div className={styles.main}>
          <div className={styles.mainCard}>
            <ConsultationDetailTabs
              consultationId={consultationId}
              vetId={user.id}
              petSpecies={pet?.species || 'dog'}
              initialSoapData={soapNoteData}
              hasSoapNotes={hasSoapNotes}
              isCompleted={isCompleted}
              overviewContent={overviewContent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
