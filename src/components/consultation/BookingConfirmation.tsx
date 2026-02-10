'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import styles from './BookingConfirmation.module.css';

interface BookingConfirmationProps {
  consultationId: string;
  consultationNumber: string;
  scheduledAt: string;
  petName: string;
  vetName?: string | null;
  className?: string;
}

export function BookingConfirmation({
  consultationId,
  consultationNumber,
  scheduledAt,
  petName,
  vetName,
  className,
}: BookingConfirmationProps) {
  const t = useTranslations('consultation');

  // Format date and time
  const scheduledDate = new Date(scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = scheduledDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Generate calendar event (.ics file)
  const handleAddToCalendar = () => {
    const startDate = scheduledDate;
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 minutes later

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Furrie//Consultation//EN
BEGIN:VEVENT
UID:${consultationId}@furrie.in
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Furrie Vet Consultation - ${petName}
DESCRIPTION:Video consultation for ${petName}${vetName ? ` with ${vetName}` : ''}.\\n\\nJoin link: https://app.furrie.in/consultations/${consultationId}/room
LOCATION:https://app.furrie.in/consultations/${consultationId}/room
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `furrie-consultation-${consultationNumber}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn(styles.container, className)}>
      {/* Success Icon */}
      <div className={styles.successIcon}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path
            d="M8 12l2.5 2.5L16 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className={styles.title}>{t('bookingConfirmed')}</h1>
      <p className={styles.subtitle}>
        Your consultation has been scheduled. We&apos;ll send you a reminder before your appointment.
      </p>

      {/* Appointment Details Card */}
      <div className={styles.detailsCard}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Consultation Number</span>
          <span className={styles.detailValue}>{consultationNumber}</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Date</span>
          <span className={styles.detailValue}>{dateStr}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Time</span>
          <span className={styles.detailValue}>{timeStr}</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Pet</span>
          <span className={styles.detailValue}>{petName}</span>
        </div>

        {vetName && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Veterinarian</span>
            <span className={styles.detailValue}>{vetName}</span>
          </div>
        )}
      </div>

      {/* Calendar Button */}
      <button
        type="button"
        onClick={handleAddToCalendar}
        className={styles.calendarButton}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Add to Calendar
      </button>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <div className={styles.infoIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <p className={styles.infoText}>
          You&apos;ll be able to join the video call 5 minutes before your scheduled time.
          Make sure you have a stable internet connection and your camera/microphone ready.
        </p>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Link href={`/consultations/${consultationId}`}>
          <Button variant="primary" fullWidth>
            View Appointment Details
          </Button>
        </Link>

        <Link href="/dashboard">
          <Button variant="ghost" fullWidth>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
