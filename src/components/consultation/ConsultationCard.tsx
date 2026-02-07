'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ConsultationWithRelations } from '@/lib/utils/consultationMapper';
import { formatDate, formatTime, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import styles from './ConsultationCard.module.css';

interface ConsultationCardProps {
  consultation: ConsultationWithRelations;
  className?: string;
}

const statusVariantMap: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'error'> = {
  pending: 'neutral',
  matching: 'info',
  matched: 'info',
  in_progress: 'warning',
  completed: 'success',
  missed: 'error',
  cancelled: 'error',
  no_vet_available: 'error',
};

export function ConsultationCard({ consultation, className }: ConsultationCardProps) {
  const t = useTranslations('consultation');

  const petPhoto = consultation.pet?.photoUrls?.[0];
  const statusVariant = statusVariantMap[consultation.status] || 'default';
  const displayDate = consultation.scheduledAt || consultation.createdAt;

  return (
    <Link
      href={`/consultations/${consultation.id}`}
      className={cn(styles.card, className)}
    >
      <div className={styles.content}>
        {/* Pet Avatar */}
        <div className={styles.avatar}>
          {petPhoto ? (
            <Image
              src={petPhoto}
              alt={consultation.pet?.name || 'Pet'}
              width={56}
              height={56}
              className={styles.avatarImage}
            />
          ) : (
            <div className={styles.avatarFallback}>
              {consultation.pet?.species === 'dog' ? (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.96-1.45-2.344-2.5" />
                  <path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309" />
                </svg>
              ) : (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5z" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className={styles.info}>
          <div className={styles.header}>
            <h3 className={styles.petName}>{consultation.pet?.name || 'Unknown Pet'}</h3>
            <Badge variant={statusVariant} size="sm">
              {t(consultation.status)}
            </Badge>
          </div>

          {consultation.vet && (
            <p className={styles.vetName}>Dr. {consultation.vet.fullName}</p>
          )}

          <div className={styles.meta}>
            <span className={styles.date}>{formatDate(displayDate)}</span>
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
