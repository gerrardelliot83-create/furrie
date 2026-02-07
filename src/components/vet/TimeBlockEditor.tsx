'use client';

import { useCallback } from 'react';
import type { TimeSlot } from '@/types';
import styles from './TimeBlockEditor.module.css';

interface TimeBlockEditorProps {
  slots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
}

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00',
];

export function TimeBlockEditor({ slots, onChange }: TimeBlockEditorProps) {
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
      onChange(newSlots);
    },
    [slots, onChange]
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
    </div>
  );
}
