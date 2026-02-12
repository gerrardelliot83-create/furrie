'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

interface UseVetDashboardRealtimeOptions {
  vetId: string;
  onConsultationChange: () => void;
}

/**
 * Hook for real-time updates on the vet dashboard.
 * Subscribes to consultation changes and triggers notifications + refresh callbacks.
 */
export function useVetDashboardRealtime({
  vetId,
  onConsultationChange,
}: UseVetDashboardRealtimeOptions) {
  const { toast } = useToast();
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`vet:${vetId}:dashboard-realtime`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultations',
          filter: `vet_id=eq.${vetId}`,
        },
        (payload) => {
          const consultation = payload.new as { id: string };
          // Prevent duplicate notifications for the same consultation
          if (!seenIdsRef.current.has(consultation.id)) {
            seenIdsRef.current.add(consultation.id);
            toast('New consultation assigned to you', 'info');
          }
          onConsultationChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'consultations',
          filter: `vet_id=eq.${vetId}`,
        },
        () => {
          onConsultationChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vetId, onConsultationChange, toast]);
}
