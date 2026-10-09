/**
 * Which sessions to remove from a consultation's room before someone joins
 * (VC-1, layers L1 and L4). Pure: the join route reads Daily's presence list,
 * asks this function, and ejects what it returns.
 *
 * The rule is "the pet parent always gets in":
 *   - every earlier session of the person joining now goes (a reload, a second
 *     tab, a dropped connection Daily hasn't noticed yet);
 *   - anyone else goes. The room is private, so only our two meeting tokens
 *     can be in it;
 *   - the other participant's sessions are left alone while there is a free
 *     place (a "newest" session may be a dead one and an older one live, so
 *     removing them is a last resort). Only if the room would still be full
 *     do their older sessions go, keeping their newest.
 * So the room always has a place for the person joining, however often either
 * of them rejoined. On 7 Oct the vet's earlier session stayed 9 minutes and
 * the pet parent was refused four times.
 */

export interface PresenceSession {
  /** Daily's participant (session) id. */
  id: string;
  /** The user_id from our meeting token: the profile id. */
  userId: string | null;
  /** When the session joined (ms since epoch); NaN if unknown. */
  joinTimeMs: number;
}

export function sessionsToEject(
  sessions: readonly PresenceSession[],
  opts: { callerUserId: string; otherUserId: string | null; maxParticipants: number }
): string[] {
  const eject: string[] = [];
  const other: PresenceSession[] = [];

  for (const session of sessions) {
    if (opts.otherUserId && session.userId === opts.otherUserId) {
      other.push(session);
    } else {
      // The caller's own earlier sessions, and anyone who isn't one of the two.
      eject.push(session.id);
    }
  }

  // A place is free for the caller: leave the other person's sessions alone.
  if (other.length < opts.maxParticipants) return eject;

  // Still full: keep only the other person's newest session.
  const newest = other.reduce((a, b) => (isNewer(b, a) ? b : a));
  for (const session of other) {
    if (session !== newest) eject.push(session.id);
  }
  return eject;
}

/** `a` joined after `b`; an unknown join time counts as oldest. */
function isNewer(a: PresenceSession, b: PresenceSession): boolean {
  const at = Number.isFinite(a.joinTimeMs) ? a.joinTimeMs : -Infinity;
  const bt = Number.isFinite(b.joinTimeMs) ? b.joinTimeMs : -Infinity;
  return at > bt;
}

/** Daily's GET /rooms/:name/presence body → sessions; anything malformed is skipped. */
export function parsePresence(body: unknown): PresenceSession[] {
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  const sessions: PresenceSession[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || !row.id) continue;
    const userId = typeof row.userId === 'string' && row.userId ? row.userId : null;
    const joinTimeMs = typeof row.joinTime === 'string' ? Date.parse(row.joinTime) : NaN;
    sessions.push({ id: row.id, userId, joinTimeMs });
  }
  return sessions;
}
