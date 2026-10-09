'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatIstDateTime, formatIstTime } from '@/lib/time/ist';
import { emitVetConsultationsChanged } from './vetEvents';
import styles from './VetAlerts.module.css';

/**
 * The vet hears about bookings on every vet page (C-05). One vet, bookings
 * as little as 15 minutes ahead — a toast on the dashboard was not enough.
 *
 * Alerts: a two-tone chime (Web Audio; the AudioContext is unlocked by the
 * vet's first click, see VetLayout), the tab title flashing until the tab is
 * focused, a browser notification when permission is granted, and a toast.
 *
 * Triggers:
 *   - Broadcast 'new_consultation' on vet:<id>:notifications (booking route)
 *   - Broadcast 'customer_joined' (Daily webhook: the customer is in the room)
 *   - Broadcast 'consultation_cancelled' (the customer cancelled; toast only)
 *   - a scheduled consultation starting within 5 minutes (checked every 60 s)
 *
 * No service worker or web push: the portal must be open in a tab. The vet
 * also gets the booking email and in-app notification.
 */

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 1000;
const WARNED_STORAGE_KEY = 'furrie:vet-start-warnings';

interface BookingPayload {
  consultationId?: string;
  petName?: string | null;
  scheduledAt?: string;
}

function playChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = window.__furrie_audio_context ?? new AudioContextClass();
    window.__furrie_audio_context = ctx;
    if (ctx.state === 'suspended') void ctx.resume();

    [880, 1320].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.25;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.25);
    });
  } catch {
    // Audio blocked or unsupported: the title flash and toast still work.
  }
}

function showBrowserNotification(title: string, body: string, url?: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, { body, tag: url ?? title });
    notification.onclick = () => {
      window.focus();
      if (url) window.location.assign(url);
      notification.close();
    };
  } catch {
    // Some browsers only allow notifications from a service worker.
  }
}

function readWarned(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(WARNED_STORAGE_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function saveWarned(ids: Set<string>): void {
  try {
    sessionStorage.setItem(WARNED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Private mode: warnings may repeat after a reload, which is acceptable.
  }
}

export function VetAlerts({ vetId }: { vetId: string }) {
  const { toast } = useToast();
  // Mounted only in the browser (VetLayout renders it once it knows the vet's
  // id, after its first effect), so reading Notification here is safe.
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );
  const seenRef = useRef<Set<string>>(new Set());
  const flashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string | null>(null);

  const stopFlash = useCallback(() => {
    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = null;
    }
  }, []);

  const flashTitle = useCallback(
    (message: string) => {
      if (document.visibilityState === 'visible' && document.hasFocus()) return;
      stopFlash();
      originalTitleRef.current = document.title;
      let showMessage = true;
      flashTimerRef.current = setInterval(() => {
        document.title = showMessage ? `● ${message}` : (originalTitleRef.current ?? document.title);
        showMessage = !showMessage;
      }, 1000);
    },
    [stopFlash]
  );

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') stopFlash();
    };
    window.addEventListener('focus', stopFlash);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', stopFlash);
      document.removeEventListener('visibilitychange', onVisible);
      stopFlash();
    };
  }, [stopFlash]);

  const raiseAlert = useCallback(
    (title: string, body: string, url?: string) => {
      playChime();
      flashTitle(title);
      showBrowserNotification(title, body, url);
      toast(`${title}: ${body}`, 'info');
      emitVetConsultationsChanged();
    },
    [flashTitle, toast]
  );

  // One Broadcast subscription for the whole vet portal.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const once = (key: string) => {
      if (seenRef.current.has(key)) return false;
      seenRef.current.add(key);
      return true;
    };

    try {
      channel = supabase
        .channel(`vet:${vetId}:notifications`)
        .on('broadcast', { event: 'new_consultation' }, ({ payload }) => {
          const data = payload as BookingPayload;
          if (data.consultationId && !once(`booking:${data.consultationId}`)) return;
          const when = data.scheduledAt ? `${formatIstDateTime(data.scheduledAt)} IST` : 'a new time';
          raiseAlert(
            'New booking',
            `${data.petName || 'A pet'}, ${when}`,
            data.consultationId ? `/consultations/${data.consultationId}` : undefined
          );
        })
        .on('broadcast', { event: 'customer_joined' }, ({ payload }) => {
          const data = payload as BookingPayload;
          if (data.consultationId && !once(`joined:${data.consultationId}`)) return;
          raiseAlert(
            'Customer is in the video room',
            `${data.petName ? `${data.petName}'s pet parent` : 'The pet parent'} has joined. Open the consultation to join.`,
            data.consultationId ? `/consultations/${data.consultationId}` : undefined
          );
        })
        .on('broadcast', { event: 'consultation_updated' }, () => {
          emitVetConsultationsChanged();
        })
        // CX-1: the customer cancelled (cancel route). No chime: nothing to
        // join, but the vet should know the time is free.
        .on('broadcast', { event: 'consultation_cancelled' }, ({ payload }) => {
          const data = payload as BookingPayload;
          if (data.consultationId && !once(`cancelled:${data.consultationId}`)) return;
          const when = data.scheduledAt ? `, ${formatIstDateTime(data.scheduledAt)} IST` : '';
          toast(`Consultation cancelled: ${data.petName || 'a pet'}${when}. The pet parent cancelled.`, 'info', 8000);
          emitVetConsultationsChanged();
        })
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[vet-alerts] broadcast channel ${status}`, err);
          }
        });
    } catch (err) {
      console.warn('[vet-alerts] could not subscribe to booking alerts', err);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [vetId, raiseAlert, toast]);

  // 5-minute warning before each scheduled consultation.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const check = async () => {
      const now = Date.now();
      const { data, error } = await supabase
        .from('consultations')
        .select('id, scheduled_at, pets!consultations_pet_id_fkey (name)')
        .eq('vet_id', vetId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date(now).toISOString())
        .lte('scheduled_at', new Date(now + FIVE_MINUTES_MS + CHECK_EVERY_MS).toISOString());
      if (cancelled || error || !data) return;

      const warned = readWarned();
      for (const consultation of data) {
        if (!consultation.scheduled_at || warned.has(consultation.id)) continue;
        const msUntil = new Date(consultation.scheduled_at).getTime() - now;
        if (msUntil > FIVE_MINUTES_MS + 30 * 1000) continue; // next check
        warned.add(consultation.id);
        saveWarned(warned);
        const pet = (consultation.pets as unknown as { name: string } | null)?.name;
        raiseAlert(
          'Consultation starts in 5 minutes',
          `${pet || 'Your next consultation'} at ${formatIstTime(consultation.scheduled_at)} IST. You can join now.`,
          `/consultations/${consultation.id}`
        );
      }
    };

    void check();
    const timer = setInterval(() => void check(), CHECK_EVERY_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [vetId, raiseAlert]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      setPermission(Notification.permission);
    }
    playChime(); // the click also unlocks audio; a short chime confirms it works
  };

  if (permission !== 'default') return null;

  return (
    <div className={styles.banner} role="region" aria-label="Booking alerts">
      <p className={styles.text}>
        Get a sound and a notification when a booking arrives or a consultation is about to start.
      </p>
      <button type="button" className={styles.button} onClick={requestPermission}>
        Turn on booking alerts
      </button>
    </div>
  );
}
