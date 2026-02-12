import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { mapConsultationWithRelationsFromDB } from '@/lib/utils/consultationMapper';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { JoinCallButton } from '@/components/consultation/JoinCallButton';
import { CancelConsultationButton } from '@/components/consultation/CancelConsultationButton';
import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
import type { ConsultationStatus, ConsultationOutcome } from '@/types';
import styles from './ConsultationDetail.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('consultation');
  return {
    title: t('consultations'),
  };
}

interface ConsultationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsultationDetailPage({ params }: ConsultationDetailPageProps) {
  const t = await getTranslations('consultation');
  const tSymptoms = await getTranslations('symptoms');
  const { id } = await params;

  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch consultation with relations
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      *,
      pets!consultations_pet_id_fkey (
        id, name, species, breed, photo_urls, gender
      ),
      profiles!consultations_vet_id_fkey (
        id, full_name, avatar_url
      ),
      consultation_ratings (rating, feedback_text),
      prescriptions (id, pdf_url, prescription_number),
      soap_notes (
        provisional_diagnosis,
        home_care_instructions,
        warning_signs,
        follow_up_timeframe,
        in_person_visit_recommended,
        in_person_urgency
      )
    `)
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (error) {
    console.error('Consultation fetch error:', error);
    notFound();
  }

  if (!data) {
    console.error('No consultation found for id:', id, 'user:', user.id);
    notFound();
  }

  // Fetch vet_profiles separately (no direct FK from consultations to vet_profiles)
  let vetProfile: { qualifications: string | null; years_of_experience: number | null } | null = null;
  if (data.vet_id) {
    const { data: vp } = await supabase
      .from('vet_profiles')
      .select('qualifications, years_of_experience')
      .eq('id', data.vet_id)
      .single();
    vetProfile = vp;
  }

  const consultation = mapConsultationWithRelationsFromDB(
    data as Parameters<typeof mapConsultationWithRelationsFromDB>[0]
  );

  // Extract additional data
  const soapNote = Array.isArray(data.soap_notes) ? data.soap_notes[0] : data.soap_notes;
  const hasRating = consultation.rating !== undefined;
  const hasPrescription = consultation.prescription !== undefined;

  const statusVariant = getStatusVariant(
    consultation.status as ConsultationStatus,
    consultation.outcome as ConsultationOutcome | null
  );
  const statusText = getStatusDisplayText(
    consultation.status as ConsultationStatus,
    consultation.outcome as ConsultationOutcome | null
  );
  const petPhoto = consultation.pet?.photoUrls?.[0];

  return (
    <div className={styles.container}>
      {/* Back Link */}
      <Link href="/consultations" className={styles.backLink}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Consultations
      </Link>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <p className={styles.consultationNumber}>{consultation.consultationNumber}</p>
          <h1 className={styles.title}>Consultation Details</h1>
        </div>
        <Badge variant={statusVariant} size="md">
          {statusText}
        </Badge>
      </header>

      {/* Join Call Section - for scheduled/active consultations */}
      {['scheduled', 'active'].includes(consultation.status) && consultation.scheduledAt && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Video Consultation</h2>
          <JoinCallButton
            consultationId={consultation.id}
            scheduledAt={consultation.scheduledAt}
            status={consultation.status}
            userRole="customer"
          />
        </section>
      )}

      {/* Cancel Section - for pending/scheduled consultations */}
      {['pending', 'scheduled'].includes(consultation.status) && (
        <section className={styles.card}>
          <CancelConsultationButton consultationId={consultation.id} />
        </section>
      )}

      {/* Pet Card */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Pet Information</h2>
        <div className={styles.petRow}>
          <div className={styles.petAvatar}>
            {petPhoto ? (
              <Image src={petPhoto} alt={consultation.pet?.name || ''} width={64} height={64} className={styles.petImage} />
            ) : (
              <div className={styles.petFallback}>
                {consultation.pet?.species === 'dog' ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" />
                    <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309" />
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5z" />
                  </svg>
                )}
              </div>
            )}
          </div>
          <div className={styles.petInfo}>
            <h3 className={styles.petName}>{consultation.pet?.name}</h3>
            <p className={styles.petDetails}>{consultation.pet?.breed} ({consultation.pet?.species})</p>
          </div>
          <Link href={`/pets/${consultation.pet?.id}`}>
            <Button variant="ghost" size="sm">View Profile</Button>
          </Link>
        </div>
      </section>

      {/* Vet Card */}
      {consultation.vet && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Veterinarian</h2>
          <div className={styles.vetRow}>
            <div className={styles.vetAvatar}>
              {consultation.vet.avatarUrl ? (
                <Image src={consultation.vet.avatarUrl} alt={consultation.vet.fullName} width={48} height={48} className={styles.vetImage} />
              ) : (
                <div className={styles.vetFallback}>
                  {consultation.vet.fullName.charAt(0)}
                </div>
              )}
            </div>
            <div className={styles.vetInfo}>
              <h3 className={styles.vetName}>Dr. {consultation.vet.fullName}</h3>
              {vetProfile?.qualifications && (
                <p className={styles.vetQualifications}>{vetProfile.qualifications}</p>
              )}
              {vetProfile?.years_of_experience && (
                <p className={styles.vetExperience}>{vetProfile.years_of_experience} years experience</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Consultation Details */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Consultation Details</h2>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Date</span>
          <span className={styles.detailValue}>
            {formatDate(consultation.scheduledAt || consultation.createdAt)}
          </span>
        </div>

        {/* Show scheduled time for upcoming consultations */}
        {consultation.scheduledAt && !consultation.startedAt && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Scheduled Time</span>
            <span className={styles.detailValue}>
              {formatTime(consultation.scheduledAt)}
            </span>
          </div>
        )}

        {/* Show actual call time for completed consultations */}
        {consultation.startedAt && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Time</span>
            <span className={styles.detailValue}>
              {formatTime(consultation.startedAt)}
              {consultation.endedAt && ` - ${formatTime(consultation.endedAt)}`}
            </span>
          </div>
        )}

        {consultation.durationMinutes > 0 && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Duration</span>
            <span className={styles.detailValue}>{consultation.durationMinutes} minutes</span>
          </div>
        )}

        {consultation.amountPaid !== null && consultation.amountPaid > 0 && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Amount Paid</span>
            <span className={styles.detailValue}>{formatCurrency(consultation.amountPaid)}</span>
          </div>
        )}

        {consultation.isFree && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Payment</span>
            <span className={styles.detailValue}>
              <Badge variant="success" size="sm">Included in Furrie Plus</Badge>
            </span>
          </div>
        )}
      </section>

      {/* Concern & Symptoms */}
      {(consultation.concernText || consultation.symptomCategories.length > 0) && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Concern & Symptoms</h2>
            {consultation.status === 'scheduled' && (
              <Link href={`/consultations/${consultation.id}/edit`}>
                <Button variant="ghost" size="sm">Edit</Button>
              </Link>
            )}
          </div>

          {consultation.concernText && (
            <div className={styles.concernText}>
              <p>{consultation.concernText}</p>
            </div>
          )}

          {consultation.symptomCategories.length > 0 && (
            <div className={styles.symptoms}>
              {consultation.symptomCategories.map((symptom) => (
                <span key={symptom} className={styles.symptomTag}>
                  {tSymptoms(symptom)}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SOAP Summary - Simplified for customer */}
      {soapNote && consultation.status === 'closed' && consultation.outcome === 'success' && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Consultation Summary</h2>

          {soapNote.provisional_diagnosis && (
            <div className={styles.summarySection}>
              <h3 className={styles.summaryLabel}>Assessment</h3>
              <p className={styles.summaryText}>{soapNote.provisional_diagnosis}</p>
            </div>
          )}

          {soapNote.home_care_instructions && (
            <div className={styles.summarySection}>
              <h3 className={styles.summaryLabel}>Home Care Instructions</h3>
              <p className={styles.summaryText}>{soapNote.home_care_instructions}</p>
            </div>
          )}

          {soapNote.warning_signs && (
            <div className={styles.summarySection}>
              <h3 className={styles.summaryLabel}>Warning Signs to Watch For</h3>
              <p className={styles.summaryText}>{soapNote.warning_signs}</p>
            </div>
          )}

          {soapNote.in_person_visit_recommended && (
            <div className={styles.inPersonWarning}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <strong>In-Person Visit Recommended</strong>
                {soapNote.in_person_urgency && (
                  <p>Urgency: {soapNote.in_person_urgency}</p>
                )}
              </div>
            </div>
          )}

          {soapNote.follow_up_timeframe && (
            <div className={styles.summarySection}>
              <h3 className={styles.summaryLabel}>Follow-up</h3>
              <p className={styles.summaryText}>{soapNote.follow_up_timeframe}</p>
            </div>
          )}
        </section>
      )}

      {/* Follow-up Chat - only show if SOAP notes exist */}
      {soapNote && consultation.status === 'closed' && consultation.outcome === 'success' && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Follow-up Chat</h2>
          <div className={styles.followUpInfo}>
            <p className={styles.followUpDescription}>
              Have questions after your consultation? Chat with Dr. {consultation.vet?.fullName} about your pet&apos;s care.
            </p>
            <Link href={`/consultations/${consultation.id}/follow-up`}>
              <Button variant="secondary" size="sm">
                Open Chat
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Prescription */}
      {hasPrescription && consultation.prescription?.pdfUrl && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Prescription</h2>
          <div className={styles.prescriptionRow}>
            <div className={styles.prescriptionInfo}>
              <p className={styles.prescriptionNumber}>
                {consultation.prescription.prescriptionNumber}
              </p>
            </div>
            <a
              href={consultation.prescription.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm">
                Download PDF
              </Button>
            </a>
          </div>
        </section>
      )}

      {/* Rating */}
      {consultation.status === 'closed' && consultation.outcome === 'success' && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Your Feedback</h2>
          {hasRating ? (
            <div className={styles.ratingDisplay}>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill={star <= (consultation.rating?.rating || 0) ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    className={star <= (consultation.rating?.rating || 0) ? styles.starFilled : styles.starEmpty}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              {consultation.rating?.feedbackText && (
                <p className={styles.feedbackText}>&ldquo;{consultation.rating.feedbackText}&rdquo;</p>
              )}
            </div>
          ) : (
            <div className={styles.ratingPrompt}>
              <p>Help us improve by rating your consultation experience.</p>
              <Button variant="secondary" size="sm">
                Rate Consultation
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
