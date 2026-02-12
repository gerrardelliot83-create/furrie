'use client';

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Consultation } from '@/types';
import { getStatusVariant, getStatusDisplayText } from '@/lib/utils/statusHelpers';
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
  vetId: string;
  initialConsultations: ConsultationWithRelations[];
}

export interface RecentConsultationsListRef {
  refresh: () => Promise<void>;
}

export const RecentConsultationsList = forwardRef<RecentConsultationsListRef, RecentConsultationsListProps>(
  function RecentConsultationsList({ vetId, initialConsultations }, ref) {
    const [consultations, setConsultations] = useState(initialConsultations);

    const refresh = useCallback(async () => {
      const supabase = createClient();

      const { data } = await supabase
        .from('consultations')
        .select(`
          *,
          pets!consultations_pet_id_fkey (
            id,
            name,
            species,
            breed
          ),
          profiles!consultations_customer_id_fkey (
            id,
            full_name
          )
        `)
        .eq('vet_id', vetId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const mapped: ConsultationWithRelations[] = data.map((row) => ({
          id: row.id,
          consultationNumber: row.consultation_number,
          customerId: row.customer_id,
          vetId: row.vet_id,
          petId: row.pet_id,
          type: row.type as 'direct_connect' | 'scheduled' | 'follow_up',
          status: row.status,
          outcome: row.outcome,
          scheduledAt: row.scheduled_at,
          startedAt: row.started_at,
          endedAt: row.ended_at,
          durationMinutes: row.duration_minutes,
          wasExtended: row.was_extended,
          concernText: row.concern_text,
          symptomCategories: row.symptom_categories || [],
          isFollowUp: row.is_follow_up,
          parentConsultationId: row.parent_consultation_id,
          followUpExpiresAt: row.follow_up_expires_at,
          dailyRoomName: row.daily_room_name,
          dailyRoomUrl: row.daily_room_url,
          recordingId: row.recording_id,
          recordingUrl: row.recording_url,
          paymentId: row.payment_id,
          amountPaid: row.amount_paid,
          isPriority: row.is_priority,
          isFree: row.is_free,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          pet: row.pets,
          customer: row.profiles ? {
            id: row.profiles.id,
            fullName: row.profiles.full_name,
          } : undefined,
        }));
        setConsultations(mapped);
      }
    }, [vetId]);

    useImperativeHandle(ref, () => ({ refresh }));

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
            <Link href="/consultations" className={styles.viewAllLink}>
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
                      <Badge variant={getStatusVariant(consultation.status, consultation.outcome)}>
                        {getStatusDisplayText(consultation.status, consultation.outcome)}
                      </Badge>
                    </td>
                    <td>
                      <Link
                        href={`/consultations/${consultation.id}`}
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
);
