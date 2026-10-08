/**
 * When a consultation's video call can be joined (VC-1). Pure and free of
 * server imports, so client components (Join buttons, the vet's schedule)
 * and the join API use the same numbers. lib/scheduling re-exports them.
 */

export const JOIN_WINDOW_BEFORE_MINUTES = 10;
export const JOIN_WINDOW_AFTER_MINUTES = 45;

export const JOIN_WINDOW_BEFORE_MS = JOIN_WINDOW_BEFORE_MINUTES * 60 * 1000;
export const JOIN_WINDOW_AFTER_MS = JOIN_WINDOW_AFTER_MINUTES * 60 * 1000;

/**
 * A call already in progress ('active') can be rejoined until the room closes
 * (lib/daily/roomLife: booking + 90 min). Without this, a drop or a reload
 * after start + 45 min locked both people out of a call that was still open.
 */
export const REJOIN_ACTIVE_UNTIL_MINUTES = 90;

/** Whether someone may (re)join now, given the consultation's status. */
export function canJoinNow(scheduledAt: string | Date, status: string, nowMs: number): boolean {
  if (status === 'active') {
    return nowMs <= new Date(scheduledAt).getTime() + REJOIN_ACTIVE_UNTIL_MINUTES * 60 * 1000;
  }
  return joinWindowState(scheduledAt, nowMs).phase === 'open';
}

export type JoinWindowState =
  | { phase: 'early'; opensInMs: number }
  | { phase: 'open' }
  | { phase: 'over' };

/** Where `nowMs` falls relative to the join window of a call starting at `scheduledAt`. */
export function joinWindowState(scheduledAt: string | Date, nowMs: number): JoinWindowState {
  const startMs = new Date(scheduledAt).getTime();
  const opensAt = startMs - JOIN_WINDOW_BEFORE_MS;
  const closesAt = startMs + JOIN_WINDOW_AFTER_MS;
  if (nowMs < opensAt) return { phase: 'early', opensInMs: opensAt - nowMs };
  if (nowMs > closesAt) return { phase: 'over' };
  return { phase: 'open' };
}
