import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ejectOwnSession, roomNameForConsultation } from '@/lib/daily';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { withRoute } from '@/server/handler';

const SESSION_ID = /^[0-9a-f-]{8,64}$/i;

/**
 * POST /api/consultations/[id]/leave   body: { sessionId }
 *
 * Sent by the call page with navigator.sendBeacon when the tab is closed,
 * reloaded or left (VC-1, L3). Daily otherwise keeps the departed session in
 * the room until it notices it is gone, which on 7 Oct took 9 minutes and
 * filled the room. The session is removed only if Daily says it belongs to the
 * caller, so nobody can remove the other participant.
 *
 * Always answers 204 (a beacon can't read the answer, and a page that is
 * closing has nothing to do with one).
 */
export const POST = withRoute(async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const done = () => new NextResponse(null, { status: 204 });

  const { user, error: authError } = await getRequestUser();
  const { id } = await params;
  if (authError || !user) return done();
  // Each call costs up to two Daily API calls; one per page close is normal.
  if (!checkRateLimit(`leave:${user.id}`, { maxRequests: 20, windowMs: 5 * 60 * 1000 }).success) return done();

  const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!SESSION_ID.test(sessionId)) return done();

  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select('id, customer_id, vet_id')
    .eq('id', id)
    .maybeSingle();
  if (!consultation || (consultation.customer_id !== user.id && consultation.vet_id !== user.id)) {
    return done();
  }

  const removed = await ejectOwnSession(roomNameForConsultation(id), sessionId, user.id);
  console.log(`[leave] consultation=${id} session_removed=${removed}`);
  return done();
});
