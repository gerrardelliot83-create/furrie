'use client';

import { useState, useCallback } from 'react';
import type { TimeSlot } from '@/types';
import styles from './TimeBlockEditor.module.css';

interface TimeBlockEditorProps {
  slots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
}

const MIN_BLOCK_MINUTES = 30;

/** Check if two time slots overlap */
function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Get duration in minutes between two HH:MM time strings */
function getDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

const TIME_OPTIONS = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30',
  '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
];

export function TimeBlockEditor({ slots, onChange }: TimeBlockEditorProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  /** Validate all slots and update state. Returns true if valid. */
  const validateSlots = useCallback((newSlots: TimeSlot[]): boolean => {
    for (let i = 0; i < newSlots.length; i++) {
      const slot = newSlots[i];
      const duration = getDurationMinutes(slot.start, slot.end);
      if (duration < MIN_BLOCK_MINUTES) {
        setValidationError(`Block ${i + 1} must be at least ${MIN_BLOCK_MINUTES} minutes.`);
        return false;
      }
      for (let j = i + 1; j < newSlots.length; j++) {
        if (slotsOverlap(slot, newSlots[j])) {
          setValidationError(`Block ${i + 1} overlaps with Block ${j + 1}. Please adjust the times.`);
          return false;
        }
      }
    }
    setValidationError(null);
    return true;
  }, []);

  const handleAddSlot = useCallback(() => {
    // Find a reasonable default time that doesn't overlap
    let startTime = '09:00';
    let endTime = '17:00';

    if (slots.length > 0) {
      const lastSlot = slots[slots.length - 1];
      const lastEndIndex = TIME_OPTIONS.indexOf(lastSlot.end);
      if (lastEndIndex >= 0 && lastEndIndex < TIME_OPTIONS.length - 2) {
        startTime = TIME_OPTIONS[lastEndIndex + 1];
        endTime = TIME_OPTIONS[Math.min(lastEndIndex + 5, TIME_OPTIONS.length - 1)];
      }
    }

    onChange([...slots, { start: startTime, end: endTime }]);
  }, [slots, onChange]);

  const handleRemoveSlot = useCallback((index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  }, [slots, onChange]);

  const handleSlotChange = useCallback(
    (index: number, field: 'start' | 'end', value: string) => {
      const newSlots = [...slots];
      newSlots[index] = { ...newSlots[index], [field]: value };
      validateSlots(newSlots);
      onChange(newSlots);
    },
    [slots, onChange, validateSlots]
  );

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (slots.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.emptyText}>No availability set</p>
        <button
          type="button"
          className={styles.addButton}
          onClick={handleAddSlot}
        >
          + Add Time Block
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.slotsList}>
        {slots.map((slot, index) => (
          <div key={index} className={styles.slotRow}>
            <select
              value={slot.start}
              onChange={(e) => handleSlotChange(index, 'start', e.target.value)}
              className={styles.timeSelect}
            >
              {TIME_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {formatTime(time)}
                </option>
              ))}
            </select>
            <span className={styles.separator}>to</span>
            <select
              value={slot.end}
              onChange={(e) => handleSlotChange(index, 'end', e.target.value)}
              className={styles.timeSelect}
            >
              {TIME_OPTIONS.filter((time) => time > slot.start).map((time) => (
                <option key={time} value={time}>
                  {formatTime(time)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => handleRemoveSlot(index)}
              aria-label="Remove time block"
            >
              x
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.addButton}
        onClick={handleAddSlot}
      >
        + Add Time Block
      </button>
      {validationError && (
        <p className={styles.validationError}>{validationError}</p>
      )}
    </div>
  );
}
