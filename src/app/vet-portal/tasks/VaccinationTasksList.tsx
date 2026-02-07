'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { VaccinationApprovalCard } from '@/components/vet/VaccinationApprovalCard';

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
  index: number;
}

interface VaccinationTasksListProps {
  initialApprovals: VaccinationRecord[];
}

export function VaccinationTasksList({ initialApprovals }: VaccinationTasksListProps) {
  const [approvals, setApprovals] = useState(initialApprovals);

  const handleApproved = useCallback((petId: string, index: number) => {
    setApprovals((prev) =>
      prev.filter((a) => !(a.petId === petId && a.index === index))
    );
  }, []);

  const handleRejected = useCallback((petId: string, index: number) => {
    setApprovals((prev) =>
      prev.filter((a) => !(a.petId === petId && a.index === index))
    );
  }, []);

  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent>
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-8)',
            color: 'var(--color-text-secondary)'
          }}>
            <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-2)' }}>
              No pending tasks
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              All vaccination records have been reviewed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        {approvals.length} pending approval{approvals.length !== 1 ? 's' : ''}
      </p>
      {approvals.map((record) => (
        <VaccinationApprovalCard
          key={`${record.petId}-${record.index}`}
          record={record}
          onApproved={() => handleApproved(record.petId, record.index)}
          onRejected={() => handleRejected(record.petId, record.index)}
        />
      ))}
    </div>
  );
}
