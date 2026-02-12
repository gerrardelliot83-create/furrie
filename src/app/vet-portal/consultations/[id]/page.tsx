import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { FlagButton } from '@/components/vet/FlagButton';
import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
import type { ConsultationStatus, ConsultationOutcome } from '@/types';
import styles from './page.module.css';

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

  // Fetch consultation with all related data
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
        photo_urls
      ),
      profiles!consultations_customer_id_fkey (
        id,
        full_name,
        email,
        phone
      ),
      soap_notes (
        id
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

  const pet = consultation.pets;
  const customer = consultation.profiles;
  const hasSoapNotes = consultation.soap_notes && consultation.soap_notes.length > 0;
  const hasPrescription = consultation.prescriptions && consultation.prescriptions.length > 0;
  const rating = consultation.consultation_ratings?.[0];
  const flag = consultation.consultation_flags?.[0];
  const isActive = ['scheduled', 'active'].includes(consultation.status);

  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  // Use scheduled_at for scheduled consultations, fall back to created_at
  const displayDate = consultation.scheduled_at
    ? new Date(consultation.scheduled_at)
    : new Date(consultation.created_at);
  const hasScheduledTime = !!consultation.scheduled_at;

  return (
    <div className={styles.container}>
      <Link href="/consultations" className={styles.backLink}>
        ← Back to Consultations
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

      <div className={styles.grid}>
        {/* Pet Info Card */}
        <div className={styles.petCard}>
          <h2 className={styles.cardTitle}>Patient</h2>
          <div className={styles.petInfo}>
            <div className={styles.petAvatar}>
              {pet?.photo_urls && pet.photo_urls.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pet.photo_urls[0]}
                  alt={pet.name}
                  className={styles.petAvatarImage}
                />
              ) : (
                pet?.species === 'dog' ? 'D' : 'C'
              )}
            </div>
            <div className={styles.petDetails}>
              <h3 className={styles.petName}>{pet?.name || 'Unknown Pet'}</h3>
              <p className={styles.petSpecies}>
                {pet?.species === 'dog' ? 'Dog' : 'Cat'} - {pet?.breed || 'Unknown breed'}
              </p>
              <div className={styles.petMeta}>
                <div className={styles.petMetaItem}>
                  <span className={styles.petMetaLabel}>Age: </span>
                  <span className={styles.petMetaValue}>
                    {calculateAge(pet?.date_of_birth, pet?.approximate_age_months)}
                  </span>
                </div>
                {pet?.weight_kg && (
                  <div className={styles.petMetaItem}>
                    <span className={styles.petMetaLabel}>Weight: </span>
                    <span className={styles.petMetaValue}>{pet.weight_kg} kg</span>
                  </div>
                )}
                <div className={styles.petMetaItem}>
                  <span className={styles.petMetaLabel}>Gender: </span>
                  <span className={styles.petMetaValue}>
                    {pet?.gender === 'male' ? 'Male' : 'Female'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className={styles.customerCard}>
          <h2 className={styles.cardTitle}>Pet Parent</h2>
          <div className={styles.customerInfo}>
            <h3 className={styles.customerName}>{customer?.full_name || 'Unknown'}</h3>
            {customer?.phone && (
              <p className={styles.customerContact}>{customer.phone}</p>
            )}
            {customer?.email && (
              <p className={styles.customerContact}>{customer.email}</p>
            )}
          </div>
        </div>

        {/* Consultation Details Card */}
        <div className={styles.detailsCard}>
          <h2 className={styles.cardTitle}>Details</h2>
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
            {consultation.status === 'completed' && (
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
                <span className={styles.detailValue}>★ {rating.rating}/5</span>
              </div>
            )}
          </div>
        </div>

        {/* Concern Card */}
        {consultation.concern_text && (
          <div className={styles.detailsCard}>
            <h2 className={styles.cardTitle}>Chief Concern</h2>
            <div className={styles.concernText}>
              {consultation.concern_text}
            </div>
            {consultation.symptom_categories && consultation.symptom_categories.length > 0 && (
              <div className={styles.symptoms} style={{ marginTop: 'var(--space-3)' }}>
                {consultation.symptom_categories.map((symptom: string) => (
                  <Badge key={symptom} variant="neutral">
                    {symptom}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions Card */}
        <div className={styles.actionsCard}>
          <h2 className={styles.cardTitle}>Actions</h2>
          <div className={styles.actions}>
            {isActive && (
              <Link
                href={`/consultations/${consultationId}/room`}
                className={styles.actionButtonWarning}
              >
                Join Video Call
              </Link>
            )}

            <Link
              href={`/consultations/${consultationId}/soap`}
              className={hasSoapNotes ? styles.actionButtonSecondary : styles.actionButton}
            >
              {hasSoapNotes ? 'Edit SOAP Notes' : 'Write SOAP Notes'}
            </Link>

            <Link
              href={`/consultations/${consultationId}/prescription`}
              className={hasPrescription ? styles.actionButtonSecondary : styles.actionButton}
            >
              {hasPrescription ? 'View Prescription' : 'Generate Prescription'}
            </Link>

            {hasSoapNotes ? (
              <Link
                href={`/consultations/${consultationId}/follow-up`}
                className={styles.actionButtonSecondary}
              >
                Follow-up Chat
              </Link>
            ) : (
              <span
                className={styles.actionButtonDisabled}
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
      </div>
    </div>
  );
}
