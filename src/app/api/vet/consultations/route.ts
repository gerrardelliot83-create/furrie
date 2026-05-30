import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/withAuth';
import { mapConsultationWithRelationsFromDB } from '@/lib/utils/consultationMapper';

/**
 * GET /api/vet/consultations
 *
 * Bearer-aware (mobile) / cookie-aware (web) endpoint that returns the
 * SIGNED-IN vet's assigned consultations for the dashboard queue.
 *
 * Why this exists (vs. the generic GET /api/consultations): the generic
 * list relies on RLS to scope rows to the caller and does not filter by
 * `vet_id` explicitly. Mobile authenticates with a Bearer token and needs
 * an endpoint that is explicitly vet-scoped server-side. This route adds
 * an explicit `.eq('vet_id', user.id)` filter on top of RLS
 * (defense-in-depth) and is the initial-list source for the E-1 dashboard;
 * the realtime `vet:${vetId}:notifications` broadcast then appends/updates.
 *
 * Shape: `{ consultations: ConsultationWithRelations[] }`, reusing
 * `mapConsultationWithRelationsFromDB()`. Each item carries `pet` (the
 * patient) and `customer` (the owner's name) — mirroring the existing
 * vet-facing reads (`/api/vet/stats`, the web vet consultations list).
 * The `vet` self-join is intentionally omitted (redundant for the vet's
 * own dashboard). SOAP notes + media are NOT joined here (lean list);
 * fetch full detail via `GET /api/consultations/[id]`.
 *
 * Query params:
 *  - `status`  comma-separated subset of pending,scheduled,active,closed
 *              (invalid values are ignored; omit for all statuses)
 *  - `limit`   default 50, capped at 100
 */

const VALID_STATUSES = ['pending', 'scheduled', 'active', 'closed'] as const;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  try {
    const { user, error: authError, supabase } = await getRequestUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Verify user is a vet (mirrors /api/vet/stats). The explicit vet_id
    // filter below would already return an empty set for non-vets, but a
    // clean 403 is friendlier and keeps parity with sibling vet routes.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'vet') {
      return NextResponse.json(
        { error: 'Unauthorized - Vet access required', code: 'VET_REQUIRED' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const limitParam = searchParams.get('limit');

    // Build query with relations. Owner is aliased as `customer` (distinct
    // from the generic mapper's `profiles` -> vet self-join, which we omit).
    let query = supabase
      .from('consultations')
      .select(
        `
        *,
        pets!consultations_pet_id_fkey (
          id,
          name,
          species,
          breed,
          photo_urls
        ),
        customer:profiles!consultations_customer_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        consultation_ratings (
          rating,
          feedback_text
        ),
        prescriptions (
          id,
          pdf_url,
          prescription_number
        )
      `
      )
      // Explicit vet-scoping (defense-in-depth alongside RLS
      // "Vets can read assigned consultations").
      .eq('vet_id', user.id)
      // Queue order: soonest appointment first; pending/no-slot rows last.
      .order('scheduled_at', { ascending: true, nullsFirst: false });

    // Apply status filter — validate against the enum so junk never hits the DB.
    if (statusParam) {
      const statuses = statusParam
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is (typeof VALID_STATUSES)[number] =>
          (VALID_STATUSES as readonly string[]).includes(s)
        );
      if (statuses.length > 0) {
        query = query.in('status', statuses);
      }
    }

    // Apply limit — default 50, hard-capped at 100 to avoid unbounded scans.
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, MAX_LIMIT);
      }
    }
    query = query.limit(limit);

    const { data: consultations, error } = await query;

    if (error) {
      console.error('Error fetching vet consultations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch consultations', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Map database rows to TypeScript interface with relations
    const mappedConsultations = (consultations || []).map((row) =>
      mapConsultationWithRelationsFromDB(
        row as Parameters<typeof mapConsultationWithRelationsFromDB>[0]
      )
    );

    return NextResponse.json({ consultations: mappedConsultations });
  } catch (error) {
    console.error('Unexpected error in GET /api/vet/consultations:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
