'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ConsultationWithRelations } from '@/lib/utils/consultationMapper';
import { formatDate, formatTime, cn } from '@/lib/utils';
import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
import type { ConsultationStatus, ConsultationOutcome } from '@/types';
import { Badge } from '@/components/ui/Badge';
import styles from './ConsultationCard.module.css';

interface ConsultationCardProps {
  consultation: ConsultationWithRelations;
  className?: string;
}

export function ConsultationCard({ consultation, className }: ConsultationCardProps) {
  const t = useTranslations('consultation');

  const petPhoto = consultation.pet?.photoUrls?.[0];
  const statusVariant = getStatusVariant(
    consultation.status as ConsultationStatus,
    consultation.outcome as ConsultationOutcome | null
  );
  const statusText = getStatusDisplayText(
    consultation.status as ConsultationStatus,
    consultation.outcome as ConsultationOutcome | null
  );
  const displayDate = consultation.scheduledAt || consultation.createdAt;

  return (
    <Link
      href={`/consultations/${consultation.id}`}
      className={cn(styles.card, className)}
    >
      <div className={styles.content}>
        {/* Pet Avatar */}
        <div className={cn(styles.avatar, petPhoto && (consultation.pet?.species === 'dog' ? styles.avatarDog : styles.avatarCat))}>
          {petPhoto ? (
            <Image
              src={petPhoto}
              alt={consultation.pet?.name || 'Pet'}
              width={56}
              height={56}
              className={styles.avatarImage}
            />
          ) : (
            <img
              src={consultation.pet?.species === 'dog' ? '/assets/dog-avatar.png' : '/assets/cat-avatar.png'}
              alt={consultation.pet?.species === 'dog' ? 'Dog' : 'Cat'}
              className={styles.avatarFallback}
            />
          )}
        </div>

        {/* Info */}
        <div className={styles.info}>
          <div className={styles.header}>
            <h3 className={styles.petName}>{consultation.pet?.name || 'Unknown Pet'}</h3>
            <Badge variant={statusVariant} size="sm">
              {statusText}
            </Badge>
          </div>

          {consultation.vet && (
            <p className={styles.vetName}>Dr. {consultation.vet.fullName}</p>
          )}

          <div className={styles.meta}>
            <span className={styles.date}>{formatDate(displayDate)}</span>
            {/* Show scheduled time for upcoming consultations */}
            {consultation.scheduledAt && !consultation.startedAt && (
              <>
                <span className={styles.separator}>at</span>
                <span className={styles.time}>{formatTime(consultation.scheduledAt)}</span>
              </>
            )}
            {/* Show started time for completed consultations */}
            {consultation.startedAt && (
              <>
                <span className={styles.separator}>at</span>
                <span className={styles.time}>{formatTime(consultation.startedAt)}</span>
              </>
            )}
            {consultation.type !== 'direct_connect' && (
              <Badge variant="neutral" size="sm">
                {t(consultation.type)}
              </Badge>
            )}
          </div>

          {consultation.concernText && (
            <p className={styles.concern}>{consultation.concernText}</p>
          )}
        </div>

        {/* Chevron */}
        <div className={styles.chevron}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
