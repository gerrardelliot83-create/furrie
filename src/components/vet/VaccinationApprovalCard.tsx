'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import styles from './VaccinationApprovalCard.module.css';

interface VaccinationRecord {
  petId: string;
  petName: string;
  petSpecies: 'dog' | 'cat';
  petBreed: string;
  ownerName: string;
  vaccinationName: string;
  vaccinationDate: string;
  nextDueDate: string | null;
  administeredBy: string | null;
  index: number; // Index in the vaccination_history array
}

interface VaccinationApprovalCardProps {
  record: VaccinationRecord;
  onApproved: () => void;
  onRejected: () => void;
}

export function VaccinationApprovalCard({
  record,
  onApproved,
  onRejected,
}: VaccinationApprovalCardProps) {
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = useCallback(async () => {
    setIsApproving(true);

    try {
      const response = await fetch('/api/vet/vaccinations/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petId: record.petId,
          vaccinationIndex: record.index,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve vaccination');
      }

      toast('Vaccination approved successfully', 'success');
      onApproved();
    } catch (error) {
      console.error('Error approving vaccination:', error);
      toast(
        error instanceof Error ? error.message : 'Failed to approve',
        'error'
      );
    } finally {
      setIsApproving(false);
    }
  }, [record, toast, onApproved]);

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) {
      toast('Please provide a reason for rejection', 'error');
      return;
    }

    setIsRejecting(true);

    try {
      const response = await fetch('/api/vet/vaccinations/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petId: record.petId,
          vaccinationIndex: record.index,
          reason: rejectReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject vaccination');
      }

      toast('Vaccination record rejected', 'success');
      onRejected();
    } catch (error) {
      console.error('Error rejecting vaccination:', error);
      toast(
        error instanceof Error ? error.message : 'Failed to reject',
        'error'
      );
    } finally {
      setIsRejecting(false);
      setShowRejectForm(false);
    }
  }, [record, rejectReason, toast, onRejected]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardContent>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.petInfo}>
              <span className={styles.speciesIndicator}>
                {record.petSpecies === 'dog' ? 'D' : 'C'}
              </span>
              <div>
                <p className={styles.petName}>{record.petName}</p>
                <p className={styles.breed}>{record.petBreed}</p>
                <p className={styles.owner}>Owner: {record.ownerName}</p>
              </div>
            </div>
          </div>

          <div className={styles.vaccinationDetails}>
            <div className={styles.detailRow}>
              <span className={styles.label}>Vaccination:</span>
              <span className={styles.value}>{record.vaccinationName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Date Administered:</span>
              <span className={styles.value}>{formatDate(record.vaccinationDate)}</span>
            </div>
            {record.nextDueDate && (
              <div className={styles.detailRow}>
                <span className={styles.label}>Next Due:</span>
                <span className={styles.value}>{formatDate(record.nextDueDate)}</span>
              </div>
            )}
            {record.administeredBy && (
              <div className={styles.detailRow}>
                <span className={styles.label}>Administered By:</span>
                <span className={styles.value}>{record.administeredBy}</span>
              </div>
            )}
          </div>

          {showRejectForm ? (
            <div className={styles.rejectForm}>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className={styles.rejectInput}
                rows={2}
              />
              <div className={styles.rejectActions}>
                <Button
                  variant="secondary"
                  onClick={() => setShowRejectForm(false)}
                  disabled={isRejecting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleReject}
                  loading={isRejecting}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <Button
                variant="secondary"
                onClick={() => setShowRejectForm(true)}
                disabled={isApproving}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                loading={isApproving}
              >
                Approve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
