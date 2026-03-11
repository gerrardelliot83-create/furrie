'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
import type { ConsultationStatus, ConsultationOutcome } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import styles from './ConsultationDetailContent.module.css';

interface ConsultationDetailContentProps {
  consultationId: string;
}

interface ConsultationData {
  id: string;
  consultation_number: string;
  status: string;
  outcome: string | null;
  type: string;
  concern_text: string | null;
  symptom_categories: string[] | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  amount_paid: number | null;
  is_free: boolean;
  recording_url: string | null;
  vet_id: string | null;
  pets: {
    id: string;
    name: string;
    species: string;
    breed: string;
    photo_urls: string[] | null;
    gender: string;
  } | null;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  consultation_ratings: Array<{ rating: number; feedback_text: string | null }>;
  prescriptions: Array<{ id: string; pdf_url: string | null; prescription_number: string }>;
  soap_notes: Array<{
    provisional_diagnosis: string | null;
    home_care_instructions: string | null;
    warning_signs: string | null;
    follow_up_timeframe: string | null;
    in_person_visit_recommended: boolean | null;
    in_person_urgency: string | null;
  }>;
}

interface MediaItem {
  id: string;
  url: string;
  media_type: string;
  file_name: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

interface FollowUpThread {
  id: string;
  is_active: boolean;
  expires_at: string | null;
}

interface VetProfile {
  qualifications: string | null;
  years_of_experience: number | null;
}

export function ConsultationDetailContent({ consultationId }: ConsultationDetailContentProps) {
  const tSymptoms = useTranslations('symptoms');

  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [vetProfile, setVetProfile] = useState<VetProfile | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [followUpThread, setFollowUpThread] = useState<FollowUpThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- Intentional: reset loading state when consultationId changes
    setError(null);

    fetch(`/api/consultations/${consultationId}/detail`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setConsultation(data.consultation);
        setVetProfile(data.vetProfile);
        setMedia(data.media || []);
        setFollowUpThread(data.followUpThread);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [consultationId]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner />
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className={styles.error}>
        <p>Failed to load consultation details.</p>
      </div>
    );
  }

  const pet = consultation.pets;
  const vet = consultation.profiles;
  const soapNote = consultation.soap_notes?.[0];
  const rating = consultation.consultation_ratings?.[0];
  const prescription = consultation.prescriptions?.[0];
  const petPhoto = pet?.photo_urls?.[0];
  const isScheduledOrActive = ['scheduled', 'active'].includes(consultation.status);
  const isClosedSuccess = consultation.status === 'closed' && consultation.outcome === 'success';
  const hasFollowUpAccess = !!followUpThread && followUpThread.is_active;
  const isThreadExpired = followUpThread?.expires_at
    ? new Date(followUpThread.expires_at) < new Date()
    : false;

  const statusVariant = getStatusVariant(
    consultation.status as ConsultationStatus,
    consultation.outcome as ConsultationOutcome | null
  );
  const statusText = getStatusDisplayText(
    consultation.status as ConsultationStatus,
    consultation.outcome as ConsultationOutcome | null
  );

  const durationMinutes = consultation.started_at && consultation.ended_at
    ? Math.round((new Date(consultation.ended_at).getTime() - new Date(consultation.started_at).getTime()) / 60000)
    : 0;

  return (
    <div className={styles.container}>
      {/* Status Header */}
      <div className={styles.statusHeader}>
        <span className={styles.consultationNumber}>{consultation.consultation_number}</span>
        <Badge variant={statusVariant} size="md">{statusText}</Badge>
      </div>

      {/* Join Call */}
      {isScheduledOrActive && (
        <div className={styles.section}>
          <Link href={`/consultations/${consultation.id}/room`}>
            <Button variant="primary" size="md" className={styles.fullWidthButton}>
              Join Consultation
            </Button>
          </Link>
        </div>
      )}

      {/* Pet Info */}
      {pet && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Pet</h3>
          <div className={styles.petRow}>
            <div className={styles.petAvatar}>
              {petPhoto ? (
                <Image src={petPhoto} alt={pet.name} width={48} height={48} className={styles.petImage} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pet.species === 'dog' ? '/assets/dog-avatar.png' : '/assets/cat-avatar.png'}
                  alt={pet.species === 'dog' ? 'Dog' : 'Cat'}
                  className={styles.petImage}
                />
              )}
            </div>
            <div className={styles.petInfo}>
              <span className={styles.petName}>{pet.name}</span>
              <span className={styles.petBreed}>{pet.breed} ({pet.species})</span>
            </div>
          </div>
        </div>
      )}

      {/* Vet Info */}
      {vet && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Veterinarian</h3>
          <div className={styles.vetRow}>
            <div className={styles.vetAvatar}>
              {vet.avatar_url ? (
                <Image src={vet.avatar_url} alt={vet.full_name} width={40} height={40} className={styles.vetImage} />
              ) : (
                <span className={styles.vetFallback}>{vet.full_name.charAt(0)}</span>
              )}
            </div>
            <div className={styles.vetInfo}>
              <span className={styles.vetName}>Dr. {vet.full_name}</span>
              {vetProfile?.qualifications && (
                <span className={styles.vetQualification}>{vetProfile.qualifications}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Details</h3>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Date</span>
            <span className={styles.detailValue}>
              {formatDate(consultation.scheduled_at || consultation.created_at)}
            </span>
          </div>
          {consultation.scheduled_at && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Time</span>
              <span className={styles.detailValue}>
                {formatTime(consultation.scheduled_at)}
              </span>
            </div>
          )}
          {durationMinutes > 0 && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Duration</span>
              <span className={styles.detailValue}>{durationMinutes} min</span>
            </div>
          )}
          {consultation.amount_paid !== null && consultation.amount_paid > 0 && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Paid</span>
              <span className={styles.detailValue}>{formatCurrency(consultation.amount_paid)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Concern & Symptoms */}
      {(consultation.concern_text || (consultation.symptom_categories && consultation.symptom_categories.length > 0)) && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Concern</h3>
          {consultation.concern_text && (
            <p className={styles.concernText}>{consultation.concern_text}</p>
          )}
          {consultation.symptom_categories && consultation.symptom_categories.length > 0 && (
            <div className={styles.symptoms}>
              {consultation.symptom_categories.map((s) => (
                <Badge key={s} variant="neutral">{tSymptoms(s)}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media */}
      {media.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Media</h3>
          <div className={styles.mediaGrid}>
            {media.filter((m) => m.media_type === 'photo').map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className={styles.mediaThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.file_name || 'Photo'} className={styles.mediaImage} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SOAP Summary */}
      {soapNote && isClosedSuccess && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Summary</h3>
          {soapNote.provisional_diagnosis && (
            <div className={styles.summaryItem}>
              <h4 className={styles.summaryLabel}>Assessment</h4>
              <p className={styles.summaryText}>{soapNote.provisional_diagnosis}</p>
            </div>
          )}
          {soapNote.home_care_instructions && (
            <div className={styles.summaryItem}>
              <h4 className={styles.summaryLabel}>Home Care</h4>
              <p className={styles.summaryText}>{soapNote.home_care_instructions}</p>
            </div>
          )}
          {soapNote.warning_signs && (
            <div className={styles.summaryItem}>
              <h4 className={styles.summaryLabel}>Warning Signs</h4>
              <p className={styles.summaryText}>{soapNote.warning_signs}</p>
            </div>
          )}
          {soapNote.follow_up_timeframe && (
            <div className={styles.summaryItem}>
              <h4 className={styles.summaryLabel}>Follow-up</h4>
              <p className={styles.summaryText}>{soapNote.follow_up_timeframe}</p>
            </div>
          )}
        </div>
      )}

      {/* Follow-up Chat */}
      {isClosedSuccess && hasFollowUpAccess && !isThreadExpired && (
        <div className={styles.section}>
          <Link href={`/consultations/${consultation.id}/follow-up`}>
            <Button variant="secondary" size="sm">Open Follow-up Chat</Button>
          </Link>
        </div>
      )}

      {/* Prescription */}
      {prescription?.pdf_url && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Prescription</h3>
          <div className={styles.prescriptionRow}>
            <span className={styles.prescriptionNumber}>{prescription.prescription_number}</span>
            <a href={prescription.pdf_url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">Download PDF</Button>
            </a>
          </div>
        </div>
      )}

      {/* Rating */}
      {rating && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Your Rating</h3>
          <div className={styles.ratingDisplay}>
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={star <= rating.rating ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                className={star <= rating.rating ? styles.starFilled : styles.starEmpty}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          {rating.feedback_text && (
            <p className={styles.feedbackText}>&ldquo;{rating.feedback_text}&rdquo;</p>
          )}
        </div>
      )}

      {/* Full page link */}
      <div className={styles.fullPageLink}>
        <Link href={`/consultations/${consultation.id}`} className={styles.link}>
          View Full Details Page
        </Link>
      </div>
    </div>
  );
}
