'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import styles from './TimeSlotSelector.module.css';

interface TimeSlot {
  start: string;
  end: string;
  datetime: string;
}

interface DaySlots {
  date: string;
  dayOfWeek: string;
  times: TimeSlot[];
}

interface TimeSlotSelectorProps {
  onSelect: (slot: TimeSlot) => void;
  onBack: () => void;
  selectedSlot?: TimeSlot | null;
  className?: string;
}

export function TimeSlotSelector({
  onSelect,
  onBack,
  selectedSlot,
  className,
}: TimeSlotSelectorProps) {
  const t = useTranslations('consultation');
  const tCommon = useTranslations('common');

  const [slots, setSlots] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [localSelectedSlot, setLocalSelectedSlot] = useState<TimeSlot | null>(
    selectedSlot || null
  );

  // Fetch available slots
  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/consultations/available-slots');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch available slots');
      }

      setSlots(data.slots || []);

      // Auto-select first day with slots
      if (data.slots && data.slots.length > 0) {
        setSelectedDate(data.slots[0].date);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to load available times');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Get slots for selected date
  const selectedDaySlots = slots.find((day) => day.date === selectedDate);

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle slot selection
  const handleSlotClick = (slot: TimeSlot) => {
    setLocalSelectedSlot(slot);
  };

  // Handle continue
  const handleContinue = () => {
    if (localSelectedSlot) {
      onSelect(localSelectedSlot);
    }
  };

  if (loading) {
    return (
      <div className={cn(styles.container, styles.loadingContainer, className)}>
        <Spinner size="lg" />
        <p className={styles.loadingText}>Finding available times...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(styles.container, styles.errorContainer, className)}>
        <div className={styles.errorIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className={styles.errorTitle}>Unable to load times</h3>
        <p className={styles.errorText}>{error}</p>
        <Button variant="secondary" onClick={fetchSlots}>
          Try Again
        </Button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className={cn(styles.container, styles.emptyContainer, className)}>
        <div className={styles.emptyIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <h3 className={styles.emptyTitle}>No times available</h3>
        <p className={styles.emptyText}>
          All our veterinarians are fully booked for the next 7 days. Please check back later.
        </p>
        <div className={styles.emptyActions}>
          <Button variant="primary" onClick={fetchSlots}>
            Refresh Availability
          </Button>
          <Button variant="secondary" onClick={onBack}>
            {tCommon('back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.container, className)}>
      <h2 className={styles.title}>{t('selectTime')}</h2>
      <p className={styles.subtitle}>Choose a convenient time for your consultation</p>

      {/* Date Selector */}
      <div className={styles.dateSelector}>
        <div className={styles.dateScroll}>
          {slots.map((day) => (
            <button
              key={day.date}
              type="button"
              className={cn(
                styles.dateChip,
                selectedDate === day.date && styles.dateChipSelected
              )}
              onClick={() => setSelectedDate(day.date)}
            >
              <span className={styles.dateDay}>{formatDateDisplay(day.date)}</span>
              <span className={styles.dateSlots}>{day.times.length} slots</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots Grid */}
      {selectedDaySlots && (
        <div className={styles.timeSlotsSection}>
          <h3 className={styles.dayTitle}>{selectedDaySlots.dayOfWeek}</h3>
          <div className={styles.timeSlotsGrid}>
            {selectedDaySlots.times.map((slot) => {
              const isSelected =
                localSelectedSlot?.datetime === slot.datetime;
              return (
                <button
                  key={slot.datetime}
                  type="button"
                  className={cn(
                    styles.timeSlot,
                    isSelected && styles.timeSlotSelected
                  )}
                  onClick={() => handleSlotClick(slot)}
                >
                  {slot.start} IST
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Time Summary */}
      {localSelectedSlot && (
        <div className={styles.selectionSummary}>
          <div className={styles.summaryIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className={styles.summaryText}>
            <span className={styles.summaryLabel}>Selected time:</span>
            <span className={styles.summaryValue}>
              {formatDateDisplay(selectedDate || '')} at {localSelectedSlot.start} IST
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onBack}>
          {tCommon('back')}
        </Button>
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!localSelectedSlot}
        >
          {tCommon('continue')}
        </Button>
      </div>
    </div>
  );
}
