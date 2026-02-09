'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import type { Consultation } from '@/types';
import styles from './LiveQueuePanel.module.css';

interface QueueItem extends Consultation {
  pet?: {
    id: string;
    name: string;
    species: 'dog' | 'cat';
  };
  customer?: {
    id: string;
    fullName: string;
  };
}

interface LiveQueuePanelProps {
  vetId: string;
  isAvailable: boolean;
}

export function LiveQueuePanel({ vetId, isAvailable }: LiveQueuePanelProps) {
  const router = useRouter();
  const [matchedConsultation, setMatchedConsultation] = useState<QueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatchedConsultation = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        pets!consultations_pet_id_fkey (
          id,
          name,
          species
        ),
        profiles!consultations_customer_id_fkey (
          id,
          full_name
        )
      `)
      .eq('vet_id', vetId)
      .in('status', ['matched', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching matched consultation:', error);
      setIsLoading(false);
      return;
    }

    if (data) {
      setMatchedConsultation({
        ...data,
        id: data.id,
        consultationNumber: data.consultation_number,
        customerId: data.customer_id,
        vetId: data.vet_id,
        petId: data.pet_id,
        type: data.type,
        status: data.status,
        scheduledAt: data.scheduled_at,
        startedAt: data.started_at,
        endedAt: data.ended_at,
        durationMinutes: data.duration_minutes,
        wasExtended: data.was_extended,
        concernText: data.concern_text,
        symptomCategories: data.symptom_categories || [],
        isFollowUp: data.is_follow_up,
        parentConsultationId: data.parent_consultation_id,
        followUpExpiresAt: data.follow_up_expires_at,
        dailyRoomName: data.daily_room_name,
        dailyRoomUrl: data.daily_room_url,
        recordingId: data.recording_id,
        recordingUrl: data.recording_url,
        paymentId: data.payment_id,
        amountPaid: data.amount_paid,
        isPriority: data.is_priority,
        isFree: data.is_free,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        pet: data.pets,
        customer: data.profiles ? {
          id: data.profiles.id,
          fullName: data.profiles.full_name
        } : undefined
      });
    } else {
      setMatchedConsultation(null);
    }

    setIsLoading(false);
  }, [vetId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid real-time subscription pattern
    fetchMatchedConsultation();

    // Subscribe to real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel(`vet:${vetId}:queue`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `vet_id=eq.${vetId}`,
        },
        async () => {
          try {
            await fetchMatchedConsultation();
          } catch (error) {
            console.error('Error in realtime callback:', error);
            setMatchedConsultation(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('LiveQueuePanel subscription status:', status);
      });

    // Polling fallback: refresh every 10 seconds as backup
    const pollingInterval = setInterval(() => {
      fetchMatchedConsultation();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
    };
  }, [vetId, fetchMatchedConsultation]);

  const handleJoinCall = () => {
    if (matchedConsultation) {
      router.push(`/consultations/${matchedConsultation.id}/room`);
    }
  };

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.unavailableMessage}>
            <p>You are currently unavailable.</p>
            <p className={styles.hint}>Toggle your status to receive consultation requests.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.loading}>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!matchedConsultation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.waiting}>
            <div className={styles.pulsingDot} />
            <p>Waiting for consultation requests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className={styles.headerRow}>
          <CardTitle>Live Queue</CardTitle>
          <Badge variant={matchedConsultation.status === 'in_progress' ? 'warning' : 'success'}>
            {matchedConsultation.status === 'in_progress' ? 'In Progress' : 'Matched'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={styles.consultationCard}>
          <div className={styles.petInfo}>
            <span className={styles.speciesIndicator}>
              {matchedConsultation.pet?.species === 'dog' ? 'D' : 'C'}
            </span>
            <div>
              <p className={styles.petName}>{matchedConsultation.pet?.name || 'Unknown Pet'}</p>
              <p className={styles.customerName}>
                {matchedConsultation.customer?.fullName || 'Unknown Parent'}
              </p>
            </div>
          </div>

          {matchedConsultation.concernText && (
            <div className={styles.concern}>
              <p className={styles.concernLabel}>Concern:</p>
              <p className={styles.concernText}>{matchedConsultation.concernText}</p>
            </div>
          )}

          {matchedConsultation.symptomCategories && matchedConsultation.symptomCategories.length > 0 && (
            <div className={styles.symptoms}>
              {matchedConsultation.symptomCategories.map((symptom) => (
                <span key={symptom} className={styles.symptomTag}>
                  {symptom.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleJoinCall}
            className={styles.joinButton}
          >
            {matchedConsultation.status === 'in_progress' ? 'Rejoin Call' : 'Join Call'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
