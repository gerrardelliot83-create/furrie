'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import styles from './FlagConsultationModal.module.css';

interface FlagConsultationModalProps {
  consultationId: string;
  isOpen: boolean;
  onClose: () => void;
  onFlagged?: () => void;
}

const FLAG_REASONS = [
  { value: 'beyond_teleconsultation', label: 'Beyond Teleconsultation Scope', description: 'Case requires in-person examination or procedures' },
  { value: 'unresponsive_user', label: 'Unresponsive User', description: 'Pet parent did not respond during consultation' },
  { value: 'emergency_in_person', label: 'Emergency - In-Person Required', description: 'Pet needs immediate emergency care' },
  { value: 'inappropriate_behavior', label: 'Inappropriate Behavior', description: 'Pet parent was abusive or inappropriate' },
  { value: 'technical_issues', label: 'Technical Issues', description: 'Severe technical problems prevented proper consultation' },
  { value: 'other', label: 'Other', description: 'Other reason not listed above' },
];

export function FlagConsultationModal({
  consultationId,
  isOpen,
  onClose,
  onFlagged,
}: FlagConsultationModalProps) {
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) {
      toast('Please select a reason', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/consultations/${consultationId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: selectedReason,
          notes: additionalNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to flag consultation');
      }

      toast('Consultation flagged successfully', 'success');
      onFlagged?.();
      onClose();
    } catch (error) {
      console.error('Error flagging consultation:', error);
      toast(
        error instanceof Error ? error.message : 'Failed to flag consultation',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [consultationId, selectedReason, additionalNotes, toast, onFlagged, onClose]);

  const handleClose = useCallback(() => {
    setSelectedReason(null);
    setAdditionalNotes('');
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Flag Consultation">
      <div className={styles.content}>
        <p className={styles.description}>
          Flag this consultation if there was an issue. This will be reviewed by the admin team.
        </p>

        <div className={styles.reasons}>
          {FLAG_REASONS.map((reason) => (
            <label
              key={reason.value}
              className={`${styles.reasonOption} ${selectedReason === reason.value ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name="flagReason"
                value={reason.value}
                checked={selectedReason === reason.value}
                onChange={() => setSelectedReason(reason.value)}
                className={styles.radioInput}
              />
              <div className={styles.reasonContent}>
                <span className={styles.reasonLabel}>{reason.label}</span>
                <span className={styles.reasonDescription}>{reason.description}</span>
              </div>
            </label>
          ))}
        </div>

        <div className={styles.notesSection}>
          <label className={styles.notesLabel}>Additional Notes (optional)</label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Add any additional context..."
            className={styles.notesInput}
            rows={3}
          />
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!selectedReason}
          >
            Submit Flag
          </Button>
        </div>
      </div>
    </Modal>
  );
}
