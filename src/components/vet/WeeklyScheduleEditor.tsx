'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { TimeBlockEditor } from './TimeBlockEditor';
import type { AvailabilitySchedule, TimeSlot } from '@/types';
import styles from './WeeklyScheduleEditor.module.css';

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const DAY_LABELS: Record<typeof DAYS_OF_WEEK[number], string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

interface WeeklyScheduleEditorProps {
  vetId: string;
  initialSchedule: AvailabilitySchedule;
}

export function WeeklyScheduleEditor({ vetId, initialSchedule }: WeeklyScheduleEditorProps) {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(initialSchedule);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDayChange = useCallback((day: typeof DAYS_OF_WEEK[number], slots: TimeSlot[]) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: slots,
    }));
    setHasChanges(true);
  }, []);

  const handleCopyToAll = useCallback((sourceDay: typeof DAYS_OF_WEEK[number]) => {
    const sourceSlots = schedule[sourceDay] || [];
    if (sourceSlots.length === 0) {
      toast('No time slots to copy', 'error');
      return;
    }

    const newSchedule: AvailabilitySchedule = {};
    DAYS_OF_WEEK.forEach((day) => {
      newSchedule[day] = [...sourceSlots];
    });

    setSchedule(newSchedule);
    setHasChanges(true);
    toast('Schedule copied to all days', 'success');
  }, [schedule, toast]);

  const handleCopyToWeekdays = useCallback((sourceDay: typeof DAYS_OF_WEEK[number]) => {
    const sourceSlots = schedule[sourceDay] || [];
    if (sourceSlots.length === 0) {
      toast('No time slots to copy', 'error');
      return;
    }

    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
    const newSchedule: AvailabilitySchedule = { ...schedule };
    weekdays.forEach((day) => {
      newSchedule[day] = [...sourceSlots];
    });

    setSchedule(newSchedule);
    setHasChanges(true);
    toast('Schedule copied to weekdays', 'success');
  }, [schedule, toast]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('vet_profiles')
      .update({
        availability_schedule: schedule,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vetId);

    setIsSaving(false);

    if (error) {
      console.error('Error saving schedule:', error);
      toast('Failed to save schedule', 'error');
      return;
    }

    setHasChanges(false);
    toast('Schedule saved successfully', 'success');
  }, [vetId, schedule, toast]);

  const handleReset = useCallback(() => {
    setSchedule(initialSchedule);
    setHasChanges(false);
  }, [initialSchedule]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Weekly Availability</h2>
          <p className={styles.subtitle}>
            Set your available hours for each day of the week
          </p>
        </div>
        <div className={styles.headerActions}>
          {hasChanges && (
            <Button variant="secondary" onClick={handleReset} disabled={isSaving}>
              Reset
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isSaving}
            disabled={!hasChanges}
          >
            Save Schedule
          </Button>
        </div>
      </div>

      <div className={styles.daysGrid}>
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className={styles.dayCard}>
            <div className={styles.dayHeader}>
              <h3 className={styles.dayLabel}>{DAY_LABELS[day]}</h3>
              <div className={styles.dayActions}>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => handleCopyToWeekdays(day)}
                  title="Copy to weekdays"
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => handleCopyToAll(day)}
                  title="Copy to all days"
                >
                  All
                </button>
              </div>
            </div>
            <TimeBlockEditor
              slots={schedule[day] || []}
              onChange={(slots) => handleDayChange(day, slots)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
