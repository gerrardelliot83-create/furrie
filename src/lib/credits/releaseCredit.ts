import 'server-only';

import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Give a customer their credit back after they cancel a credit booking in
 * time (Terms §7.3). Call it AFTER the consultation has been closed with
 * outcome 'cancelled'; the caller decides whether the cancellation was early
 * enough (L1 ↔ S seam: Agent S's customer-cancel path calls this).
 *
 * Idempotent (a second call returns released: false) and never throws: a
 * failure is reported to Sentry and returned, so it can't break the cancel.
 */
export async function releaseConsultationCredit(
  consultationId: string
): Promise<{ released: boolean; packId: string | null; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('l1_release_consultation_credit', {
      p_consultation_id: consultationId,
    });
    if (error) {
      Sentry.captureException(new Error(`l1_release_consultation_credit: ${error.message}`), {
        tags: { area: 'credits', action: 'release' },
        extra: { consultationId },
      });
      return { released: false, packId: null, error: error.message };
    }
    const packId = (data as string | null) ?? null;
    return { released: packId !== null, packId };
  } catch (err) {
    Sentry.captureException(err, { tags: { area: 'credits', action: 'release' } });
    return { released: false, packId: null, error: err instanceof Error ? err.message : String(err) };
  }
}
