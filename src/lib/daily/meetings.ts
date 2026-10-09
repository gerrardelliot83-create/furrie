/**
 * Who was in a consultation's video room, and when (VC-1b). Pure: the Daily
 * client (./index getRoomAttendance) fetches GET /meetings?room=… and hands
 * the body here.
 *
 * Daily records a "meeting" each time the room goes from empty to occupied.
 * Each meeting lists its participants (one per session) with the user_id from
 * our meeting token, join_time (unix seconds) and duration (seconds).
 * https://docs.daily.co/reference/rest-api/meetings
 *
 * On 3 and 7 Oct the vet pressed Finish and the consultation was recorded as a
 * success although Daily showed the vet and the pet parent were never in the
 * call at the same time. "Both were in the room" is not enough; what counts is
 * the time they were in it together.
 */

export interface ParticipantSession {
  /** Our user id (the meeting token's user_id), or null if Daily has none. */
  userId: string | null;
  /** Unix seconds; null if Daily gave no join time (present, but never "together"). */
  joinSec: number | null;
  /** Unix seconds; "now" for someone still in an ongoing meeting; null with joinSec. */
  leaveSec: number | null;
}

export interface MeetingRecord {
  ongoing: boolean;
  /** The meeting's length in seconds (0 if Daily gave none). */
  durationSec: number;
  sessions: ParticipantSession[];
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Daily's GET /meetings body → meetings. Anything malformed is skipped; a body
 * without a `data` list is "no meetings". A participant with no duration
 * counts until `nowSec` only if the meeting is ongoing AND Daily's presence
 * list shows them in the room now (`presentUserIds`); otherwise as a moment
 * (A1: a session that ended without a duration must not stretch to "now").
 */
export function parseMeetings(
  body: unknown,
  nowSec: number,
  presentUserIds: ReadonlySet<string> = new Set()
): MeetingRecord[] {
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];

  const meetings: MeetingRecord[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const ongoing = row.ongoing === true;
    const sessions: ParticipantSession[] = [];

    for (const p of Array.isArray(row.participants) ? row.participants : []) {
      if (!p || typeof p !== 'object') continue;
      const participant = p as Record<string, unknown>;
      const userId = typeof participant.user_id === 'string' && participant.user_id ? participant.user_id : null;
      const joinSec = finiteNumber(participant.join_time);
      if (joinSec === null) {
        sessions.push({ userId, joinSec: null, leaveSec: null });
        continue;
      }
      const duration = finiteNumber(participant.duration);
      const stillHere = ongoing && userId !== null && presentUserIds.has(userId);
      const leaveSec =
        duration !== null && duration >= 0 ? joinSec + duration : stillHere ? Math.max(joinSec, nowSec) : joinSec;
      sessions.push({ userId, joinSec, leaveSec });
    }

    meetings.push({ ongoing, durationSec: Math.max(0, finiteNumber(row.duration) ?? 0), sessions });
  }
  return meetings;
}

/**
 * False when Daily says more meetings match than it returned (total_count >
 * the page), so the caller treats who-was-there as unknown rather than
 * deciding from part of the record (A2). Order doesn't matter: every meeting
 * returned is read.
 */
export function meetingsListIsComplete(body: unknown): boolean {
  const { data, total_count: total } = (body ?? {}) as { data?: unknown; total_count?: unknown };
  if (!Array.isArray(data)) return true;
  return !(typeof total === 'number' && Number.isFinite(total) && total > data.length);
}

type Interval = [start: number, end: number];

/** Sorted, non-overlapping intervals (a person's sessions can overlap: a second tab, a ghost session). */
function merge(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

function overlapLength(a: Interval[], b: Interval[]): number {
  let total = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i][0], b[j][0]);
    const end = Math.min(a[i][1], b[j][1]);
    if (end > start) total += end - start;
    if (a[i][1] < b[j][1]) i++;
    else j++;
  }
  return total;
}

/**
 * Seconds two people were in the room at the same time: per meeting, the
 * overlap of their [join_time, join_time + duration] sessions, summed.
 */
export function secondsTogether(
  meetings: readonly MeetingRecord[],
  userA: string | null,
  userB: string | null
): number {
  if (!userA || !userB || userA === userB) return 0;
  let total = 0;
  for (const meeting of meetings) {
    const of = (userId: string) =>
      merge(
        meeting.sessions.flatMap((s): Interval[] =>
          s.userId === userId && s.joinSec !== null && s.leaveSec !== null ? [[s.joinSec, s.leaveSec]] : []
        )
      );
    total += overlapLength(of(userA), of(userB));
  }
  return total;
}
