'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { VET_CONSULTATIONS_CHANGED_EVENT } from '@/components/layouts/VetLayout/vetEvents';

interface UseVetDashboardRealtimeOptions {
  vetId: string;
  onConsultationChange: () => void;
}

/**
 * Hook for real-time updates on the vet dashboard.
 *
 * The booking Broadcast (vet:<id>:notifications) is received once for the
 * whole portal by VetAlerts in the layout, which also chimes and toasts; it
 * re-emits a window event that this hook listens to (C-05). A second
 * subscription to the same topic from one tab is fragile, so this hook no
 * longer opens one.
 * The postgres_changes subscription below stays for when the Realtime
 * publication gets its tables (audit Phase 6); today it never fires.
 */
export function useVetDashboardRealtime({
  vetId,
  onConsultationChange,
}: UseVetDashboardRealtimeOptions) {
  useEffect(() => {
    const supabase = createClient();
    type Channel = ReturnType<typeof supabase.channel>;
    let changesChannel: Channel | null = null;

    const onChange = () => onConsultationChange();
    window.addEventListener(VET_CONSULTATIONS_CHANGED_EVENT, onChange);

    // Also subscribe to postgres_changes for UPDATE events
    // These work because the vet already has SELECT access to their assigned consultations
    try {
      changesChannel = supabase
        .channel(`vet:${vetId}:dashboard-updates`)
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
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[vet-dashboard-realtime] postgres_changes channel ${status}`, err);
          }
        });
    } catch (err) {
      console.warn('[vet-dashboard-realtime] failed to subscribe to postgres_changes channel', err);
    }

    return () => {
      window.removeEventListener(VET_CONSULTATIONS_CHANGED_EVENT, onChange);
      try {
        if (changesChannel) supabase.removeChannel(changesChannel);
      } catch (err) {
        console.warn('[vet-dashboard-realtime] error during cleanup', err);
      }
    };
  }, [vetId, onConsultationChange]);
}
