'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
import type { CallProblem } from '@/lib/daily/callErrors';
import { reportCallProblem } from '@/lib/daily/reportCallProblem';

/** POST /api/consultations/[id]/join response. */
export interface JoinResponse {
  roomUrl: string;
  roomName: string;
  token: string;
  consultation: {
    id: string;
    status: string;
    scheduledAt: string;
    durationMinutes: number | null;
    pet: { id: string; name: string; species: string; breed: string } | null;
    vet: { id: string; name: string; avatarUrl: string | null } | null;
  };
  participant: { id: string; name: string; role: 'vet' | 'customer'; isOwner: boolean };
}

/**
 * loading → ready (consent screen) → in-call → left, or problem (with Try
 * again) from any of them.
 */
export type RoomPhase = 'loading' | 'ready' | 'in-call' | 'problem' | 'left';

/**
 * L5: when Daily says the room is full, fetch a fresh ticket (which clears the
 * room again on the server) and retry by itself, after 2 s and then 5 s,
 * before showing "The call is busy".
 */
const FULL_ROOM_RETRY_DELAYS_MS = [2000, 5000];

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3, initialDelay = 500): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, initialDelay * Math.pow(2, attempt - 1)));
    }
    try {
      const response = await fetch(url, options);
      // Retry only what may be a race or a blip; a 4xx answer is final.
      if (response.ok || (response.status !== 404 && response.status !== 500) || attempt === maxRetries - 1) {
        return response;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxRetries - 1) throw lastError;
    }
  }
  throw lastError || new Error('Request failed after retries');
}

/**
 * Everything the pet parent's and the vet's call pages share (VC-1): the
 * join ticket, one Daily call object at a time, Try again, the automatic
 * retry for a full room (L5), and freeing the place at once when the page is
 * closed or reloaded (L3).
 */
export function useConsultationRoom(consultationId: string, role: 'customer' | 'vet') {
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<RoomPhase>('loading');
  const [problem, setProblem] = useState<CallProblem | null>(null);
  const [join, setJoin] = useState<JoinResponse | null>(null);
  const [callObject, setCallObject] = useState<DailyCall | null>(null);

  // After Try again from inside the call, go straight back in (no second consent click).
  const wasInCallRef = useRef(false);
  const autoRetriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The page is closing or reloading: the call ending then is not a problem to show or report.
  const pageHidingRef = useRef(false);

  // 1. The join ticket (room + meeting token), once per attempt.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchWithRetry(`/api/consultations/${consultationId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          const code: string = data?.code ?? `HTTP_${response.status}`;
          reportCallProblem(`join-api:${code}`, {
            consultationId,
            role,
            level: code === 'OUTSIDE_JOIN_WINDOW' || code === 'INVALID_STATUS' ? 'warning' : 'error',
            detail: data?.error ?? null,
          });
          setProblem({
            title: 'Unable to join',
            message: data?.error || 'We couldn’t open the call. Tap Try again.',
            kind: code,
          });
          setPhase('problem');
          return;
        }
        setJoin(data as JoinResponse);
      } catch (error) {
        if (cancelled) return;
        reportCallProblem('join-api:network', { consultationId, role, detail: String(error) });
        setProblem({
          title: 'We couldn’t connect',
          message: 'Check your internet connection (wifi or mobile data), then tap Try again.',
          kind: 'join-api:network',
        });
        setPhase('problem');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [consultationId, role, attempt]);

  // 2. A Daily call object for this ticket. daily-js allows one at a time, so
  // any leftover one (an earlier attempt, a quick back-and-forth) goes first.
  useEffect(() => {
    if (!join) return;
    let cancelled = false;
    let created: DailyCall | null = null;

    import('@daily-co/daily-js')
      .then(async ({ default: Daily }) => {
        const leftover = Daily.getCallInstance();
        if (leftover) await leftover.destroy().catch(() => undefined);
        if (cancelled) return;
        created = Daily.createCallObject();
        setCallObject(created);
        setPhase(wasInCallRef.current ? 'in-call' : 'ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        reportCallProblem('sdk-load', { consultationId, role, detail: String(error) });
        setProblem({
          title: 'We couldn’t load the video call',
          message: 'Check your internet connection, then tap Try again. If it keeps happening, open the link in Chrome or Safari.',
          kind: 'sdk-load',
        });
        setPhase('problem');
      });

    return () => {
      cancelled = true;
      setCallObject(null);
      if (created) void created.destroy().catch(() => undefined);
    };
  }, [join, consultationId, role]);

  // 3. L3: when the page is closed, reloaded or left, tell Daily (leave) and
  // our server (which removes the session by id) at once, so the place frees
  // now instead of when Daily notices. On 7 Oct that took 9 minutes.
  useEffect(() => {
    if (!callObject) return;
    const onPageHide = () => {
      pageHidingRef.current = true;
      try {
        if (callObject.meetingState() === 'joined-meeting') {
          const sessionId = callObject.participants()?.local?.session_id;
          if (sessionId) {
            navigator.sendBeacon(
              `/api/consultations/${consultationId}/leave`,
              new Blob([JSON.stringify({ sessionId })], { type: 'application/json' })
            );
          }
        }
        void callObject.leave().catch(() => undefined);
      } catch {
        // The page is going away; nothing more to do.
      }
    };
    // Back from the browser's page cache: the call has ended, offer Try again.
    const onPageShow = (event: PageTransitionEvent) => {
      pageHidingRef.current = false;
      if (event.persisted && wasInCallRef.current) {
        setProblem({ title: 'You left the call', message: 'Tap Try again to go back in.', kind: 'page-restored' });
        setPhase('problem');
      }
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [callObject, consultationId]);

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    []
  );

  /** Fresh ticket and a new call object; back into the call if we were in it. */
  const retry = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    setProblem(null);
    setJoin(null);
    setPhase('loading');
    setAttempt((n) => n + 1);
  }, []);

  /** The person ticked consent and pressed Join. */
  const enterCall = useCallback(() => {
    wasInCallRef.current = true;
    autoRetriesRef.current = 0;
    setPhase('in-call');
  }, []);

  /** The call stopped (VideoRoom's onFatal). A full room is retried automatically (L5). */
  const fail = useCallback(
    (callProblem: CallProblem) => {
      if (pageHidingRef.current) return;
      if (callProblem.kind === 'meeting-full' && autoRetriesRef.current < FULL_ROOM_RETRY_DELAYS_MS.length) {
        const delay = FULL_ROOM_RETRY_DELAYS_MS[autoRetriesRef.current];
        autoRetriesRef.current += 1;
        reportCallProblem('meeting-full:auto-retry', {
          consultationId,
          role,
          level: 'warning',
          detail: `retry ${autoRetriesRef.current}`,
        });
        setJoin(null);
        setPhase('loading');
        retryTimerRef.current = setTimeout(retry, delay);
        return;
      }
      reportCallProblem(callProblem.kind, { consultationId, role, level: 'error' });
      setProblem(callProblem);
      setPhase('problem');
    },
    [consultationId, role, retry]
  );

  /** The person pressed End. */
  const markLeft = useCallback(() => {
    wasInCallRef.current = false;
    setPhase('left');
  }, []);

  return { phase, problem, join, callObject, enterCall, retry, fail, markLeft };
}
