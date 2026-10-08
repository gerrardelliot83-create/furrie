/**
 * Which sessions to remove from a consultation's room before someone joins
 * (VC-1, layers L1 and L4). Pure: the join route reads Daily's presence list,
 * asks this function, and ejects what it returns.
 *
 * The rule is "the pet parent always gets in":
 *   - every earlier session of the person joining now goes (a reload, a second
 *     tab, a dropped connection Daily hasn't noticed yet);
 *   - the other participant keeps only their newest session;
 *   - anyone else goes. The room is private, so only our two meeting tokens
 *     can be in it.
 * After this the room holds at most one session (the other person's newest),
 * so it can't be full however often either of them rejoined. On 7 Oct the
 * vet's earlier session stayed 9 minutes and the pet parent was refused four
 * times.
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
  opts: { callerUserId: string; otherUserId: string | null }
): string[] {
  const eject: string[] = [];
  let newestOther: PresenceSession | null = null;

  for (const session of sessions) {
    if (session.userId === opts.callerUserId) {
      eject.push(session.id);
    } else if (opts.otherUserId && session.userId === opts.otherUserId) {
      if (!newestOther || isNewer(session, newestOther)) {
        if (newestOther) eject.push(newestOther.id);
        newestOther = session;
      } else {
        eject.push(session.id);
      }
    } else {
      eject.push(session.id);
    }
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
