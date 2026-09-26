import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Completed consultations per vet, counted from the consultations themselves.
 * vet_profiles.consultation_count is never incremented (no trigger in
 * production), so it always showed 0. Counts closed + success rows.
 */
export async function countCompletedConsultations(vetIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>(vetIds.map((id) => [id, 0]));
  if (vetIds.length === 0) return counts;

  const { data, error } = await supabaseAdmin
    .from('consultations')
    .select('vet_id')
    .in('vet_id', vetIds)
    .eq('status', 'closed')
    .eq('outcome', 'success');

  if (error) {
    console.error('Error counting completed consultations:', error);
    return counts;
  }
  for (const row of data ?? []) {
    if (row.vet_id) counts.set(row.vet_id, (counts.get(row.vet_id) ?? 0) + 1);
  }
  return counts;
}
