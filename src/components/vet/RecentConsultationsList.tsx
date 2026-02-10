'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Consultation, ConsultationStatus } from '@/types';
import styles from './RecentConsultationsList.module.css';

interface ConsultationWithRelations extends Consultation {
  pet?: {
    id: string;
    name: string;
    species: 'dog' | 'cat';
    breed: string;
  };
  customer?: {
    id: string;
    fullName: string;
  };
}

interface RecentConsultationsListProps {
  consultations: ConsultationWithRelations[];
}

export function RecentConsultationsList({ consultations }: RecentConsultationsListProps) {
  const t = useTranslations('consultation');

  const getStatusVariant = (status: ConsultationStatus): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'cancelled':
      case 'missed':
      case 'no_vet_available':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (consultations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Consultations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={styles.emptyText}>No consultations yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className={styles.headerRow}>
          <CardTitle>Recent Consultations</CardTitle>
          <Link href="/vet-portal/consultations" className={styles.viewAllLink}>
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pet</th>
                <th>Pet Parent</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map((consultation) => (
                <tr key={consultation.id}>
                  <td>
                    <div className={styles.petCell}>
                      <span className={styles.speciesIndicator}>
                        {consultation.pet?.species === 'dog' ? 'D' : 'C'}
                      </span>
                      <div>
                        <p className={styles.petName}>{consultation.pet?.name || 'Unknown'}</p>
                        <p className={styles.breed}>{consultation.pet?.breed || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td>{consultation.customer?.fullName || 'Unknown'}</td>
                  <td>{formatDate(consultation.startedAt || consultation.createdAt)}</td>
                  <td>{formatTime(consultation.startedAt || consultation.createdAt)}</td>
                  <td>
                    <Badge variant={getStatusVariant(consultation.status)}>
                      {t(consultation.status)}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      href={`/vet-portal/consultations/${consultation.id}`}
                      className={styles.actionLink}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
