/**
 * When a consultation's video call can be joined (VC-1). Pure and free of
 * server imports, so client components (Join buttons, the vet's schedule)
 * and the join API use the same numbers. lib/scheduling re-exports them.
 */

export const JOIN_WINDOW_BEFORE_MINUTES = 10;
export const JOIN_WINDOW_AFTER_MINUTES = 45;

export const JOIN_WINDOW_BEFORE_MS = JOIN_WINDOW_BEFORE_MINUTES * 60 * 1000;
export const JOIN_WINDOW_AFTER_MS = JOIN_WINDOW_AFTER_MINUTES * 60 * 1000;

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
