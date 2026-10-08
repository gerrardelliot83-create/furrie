/**
 * How long a consultation's Daily room stays open, and how many people it
 * holds (VC-1). Pure: no I/O.
 *
 * The room used to close 35 minutes after the FIRST join (`now + duration +
 * 5`), with `eject_at_room_exp`. A pet parent who opened the call early or a
 * vet who arrived late ate into the call, a long call was cut off, and the
 * join route then kept handing out the dead room. On 7 Oct the room closed at
 * exactly 35:00 after the first click.
 *
 * Now the room is open until the booking time + 90 minutes (the 45-minute
 * join window, the call and a buffer; the stale-call cron uses the same 90),
 * and never less than 30 minutes from the moment someone joins.
 */

export const ROOM_OPEN_AFTER_START_MINUTES = 90;
export const ROOM_MIN_REMAINING_MINUTES = 30;

/**
 * A private room only admits our two meeting tokens (pet parent and vet).
 * 2 places meant a reload or a dropped connection, which Daily keeps for a
 * while, filled the room: on 7 Oct the vet's earlier session stayed 9 minutes
 * and the pet parent was refused four times. The spare places absorb that.
 */
export const ROOM_MAX_PARTICIPANTS = 4;

/** Unix seconds the room should stay open until. */
export function roomExpiryFor(scheduledAt: string | null | undefined, nowMs: number): number {
  const nowSec = Math.floor(nowMs / 1000);
  const floor = nowSec + ROOM_MIN_REMAINING_MINUTES * 60;
  const startMs = scheduledAt ? new Date(scheduledAt).getTime() : NaN;
  if (!Number.isFinite(startMs)) {
    return nowSec + ROOM_OPEN_AFTER_START_MINUTES * 60;
  }
  return Math.max(Math.floor(startMs / 1000) + ROOM_OPEN_AFTER_START_MINUTES * 60, floor);
}

/**
 * True when an existing room must be updated before anyone is sent into it:
 * it closes before `wantedExp` (a minute of slack avoids rewriting it on
 * every join) or it still has the old 2-person cap.
 */
export function roomNeedsUpdate(
  config: { exp?: number | null; max_participants?: number | null } | null | undefined,
  wantedExp: number
): boolean {
  const exp = typeof config?.exp === 'number' ? config.exp : 0;
  const max = typeof config?.max_participants === 'number' ? config.max_participants : 0;
  return exp < wantedExp - 60 || max < ROOM_MAX_PARTICIPANTS;
}
