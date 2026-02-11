'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import type { Consultation, ConsultationStatus } from '@/types';
import styles from './TodaySchedulePanel.module.css';

interface ScheduledConsultation extends Consultation {
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

interface TodaySchedulePanelProps {
  vetId: string;
}

type AppointmentStatus = 'upcoming' | 'joinable' | 'in_progress' | 'completed' | 'missed';

function getAppointmentStatus(consultation: ScheduledConsultation): AppointmentStatus {
  const now = new Date();
  if (!consultation.scheduledAt) {
    return 'upcoming'; // Default for consultations without scheduled time
  }
  const scheduledAt = new Date(consultation.scheduledAt);

  // Join window: 5 min before to 45 min after
  const joinWindowStart = new Date(scheduledAt.getTime() - 5 * 60 * 1000);
  const joinWindowEnd = new Date(scheduledAt.getTime() + 45 * 60 * 1000);

  // Check closed status with outcome
  if (consultation.status === 'closed') {
    if (consultation.outcome === 'success') {
      return 'completed';
    }
    if (consultation.outcome === 'missed') {
      return 'missed';
    }
    // For other outcomes (cancelled, failed), treat as completed
    return 'completed';
  }

  if (consultation.status === 'active') {
    return 'in_progress';
  }

  if (now >= joinWindowStart && now <= joinWindowEnd) {
    return 'joinable';
  }

  if (now > joinWindowEnd) {
    return 'missed';
  }

  return 'upcoming';
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getTimeUntil(dateStr: string): string {
  const now = new Date();
  const scheduled = new Date(dateStr);
  const diffMs = scheduled.getTime() - now.getTime();

  if (diffMs < 0) {
    return 'Now';
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) {
    return 'Starting now';
  }

  if (diffMins < 60) {
    return `In ${diffMins} min`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (mins === 0) {
    return `In ${hours}h`;
  }

  return `In ${hours}h ${mins}m`;
}

export function TodaySchedulePanel({ vetId }: TodaySchedulePanelProps) {
  const router = useRouter();
  const [consultations, setConsultations] = useState<ScheduledConsultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    // Initial data fetch using local async function
    const loadSchedule = async () => {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const { data, error: fetchError } = await supabase
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
        .in('status', ['scheduled', 'active', 'closed'])
        .gte('scheduled_at', startOfDay.toISOString())
        .lt('scheduled_at', endOfDay.toISOString())
        .order('scheduled_at', { ascending: true });

      if (!isMounted) return;

      if (fetchError) {
        console.error('Error fetching schedule:', fetchError);
        setError('Failed to load schedule');
        setIsLoading(false);
        return;
      }

      const mapped: ScheduledConsultation[] = (data || []).map((item) => ({
        id: item.id,
        consultationNumber: item.consultation_number,
        customerId: item.customer_id,
        vetId: item.vet_id,
        petId: item.pet_id,
        type: item.type,
        status: item.status as ConsultationStatus,
        outcome: item.outcome,
        scheduledAt: item.scheduled_at,
        startedAt: item.started_at,
        endedAt: item.ended_at,
        durationMinutes: item.duration_minutes,
        wasExtended: item.was_extended,
        concernText: item.concern_text,
        symptomCategories: item.symptom_categories || [],
        isFollowUp: item.is_follow_up,
        parentConsultationId: item.parent_consultation_id,
        followUpExpiresAt: item.follow_up_expires_at,
        dailyRoomName: item.daily_room_name,
        dailyRoomUrl: item.daily_room_url,
        recordingId: item.recording_id,
        recordingUrl: item.recording_url,
        paymentId: item.payment_id,
        amountPaid: item.amount_paid,
        isPriority: item.is_priority,
        isFree: item.is_free,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        pet: item.pets,
        customer: item.profiles ? {
          id: item.profiles.id,
          fullName: item.profiles.full_name,
        } : undefined,
      }));

      setConsultations(mapped);
      setIsLoading(false);
      setError(null);
    };

    loadSchedule();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`vet:${vetId}:schedule`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `vet_id=eq.${vetId}`,
        },
        () => {
          loadSchedule();
        }
      )
      .subscribe();

    // Refresh every minute to update time displays
    const interval = setInterval(() => {
      // Force re-render to update "In X min" displays
      setConsultations((prev) => [...prev]);
    }, 60000);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [vetId, retryCounter]);

  const handleJoinCall = async (consultationId: string) => {
    router.push(`/consultations/${consultationId}/room`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.loading}>Loading schedule...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.error}>
            <p>{error}</p>
            <Button variant="ghost" onClick={() => setRetryCounter((c) => c + 1)}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separate active/upcoming from completed
  const activeConsultations = consultations.filter(
    (c) => c.status !== 'closed'
  );
  const completedConsultations = consultations.filter(
    (c) => c.status === 'closed'
  );

  return (
    <Card>
      <CardHeader>
        <div className={styles.headerRow}>
          <CardTitle>Today&apos;s Schedule</CardTitle>
          {activeConsultations.length > 0 && (
            <Badge variant="info">{activeConsultations.length} upcoming</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {consultations.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className={styles.emptyText}>No appointments scheduled for today</p>
            <p className={styles.emptyHint}>
              Appointments will appear here when customers book consultations with you.
            </p>
          </div>
        ) : (
          <div className={styles.scheduleList}>
            {/* Active/Upcoming appointments */}
            {activeConsultations.map((consultation) => {
              const status = getAppointmentStatus(consultation);

              return (
                <div
                  key={consultation.id}
                  className={`${styles.appointmentCard} ${styles[status]}`}
                >
                  <div className={styles.timeColumn}>
                    <span className={styles.time}>{consultation.scheduledAt ? formatTime(consultation.scheduledAt) : '--:--'}</span>
                    <span className={styles.timeUntil}>{consultation.scheduledAt ? getTimeUntil(consultation.scheduledAt) : ''}</span>
                  </div>

                  <div className={styles.detailsColumn}>
                    <div className={styles.petRow}>
                      <span className={styles.speciesIndicator}>
                        {consultation.pet?.species === 'dog' ? 'D' : 'C'}
                      </span>
                      <div className={styles.petInfo}>
                        <span className={styles.petName}>{consultation.pet?.name || 'Unknown Pet'}</span>
                        <span className={styles.customerName}>
                          {consultation.customer?.fullName || 'Unknown Parent'}
                        </span>
                      </div>
                    </div>

                    {consultation.concernText && (
                      <p className={styles.concern}>{consultation.concernText}</p>
                    )}

                    {consultation.symptomCategories && consultation.symptomCategories.length > 0 && (
                      <div className={styles.symptoms}>
                        {consultation.symptomCategories.slice(0, 3).map((symptom) => (
                          <span key={symptom} className={styles.symptomTag}>
                            {symptom.replace('_', ' ')}
                          </span>
                        ))}
                        {consultation.symptomCategories.length > 3 && (
                          <span className={styles.symptomTag}>
                            +{consultation.symptomCategories.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.actionColumn}>
                    {status === 'joinable' || status === 'in_progress' ? (
                      <Button
                        variant="primary"
                        onClick={() => handleJoinCall(consultation.id)}
                        className={styles.joinButton}
                      >
                        {status === 'in_progress' ? 'Rejoin' : 'Join Now'}
                      </Button>
                    ) : status === 'upcoming' ? (
                      <Badge variant="neutral">Upcoming</Badge>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* Completed appointments (collapsed) */}
            {completedConsultations.length > 0 && (
              <div className={styles.completedSection}>
                <p className={styles.completedHeader}>
                  Completed today ({completedConsultations.length})
                </p>
                {completedConsultations.map((consultation) => (
                  <div key={consultation.id} className={styles.completedCard}>
                    <span className={styles.completedTime}>
                      {consultation.scheduledAt ? formatTime(consultation.scheduledAt) : '--:--'}
                    </span>
                    <span className={styles.completedPet}>
                      {consultation.pet?.name || 'Unknown Pet'}
                    </span>
                    <Badge variant={consultation.outcome === 'success' ? 'success' : 'error'}>
                      {consultation.outcome === 'success' ? 'Done' : 'Missed'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
