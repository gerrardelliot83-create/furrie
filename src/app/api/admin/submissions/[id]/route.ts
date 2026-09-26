import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin/auth';
import { withRoute } from '@/server/handler';

/**
 * PATCH /api/admin/submissions/[id]
 * Approve or reject a medication/diagnosis submission.
 * Admin-only endpoint.
 */
export const PATCH = withRoute(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Shared admin check (role + is_active, C-03).
    const auth = await verifyAdmin();
    if (auth.error) return auth.error;
    const user = auth.user;
    const supabase = await createClient();

    const body = await request.json();
    const { status } = body as { status: string };

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "approved" or "rejected"', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Update submission
    const { data: submission, error: updateError } = await supabase
      .from('medication_submissions')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, type, name, status, reviewed_at')
      .single();

    if (updateError) {
      console.error('Failed to update submission:', updateError);
      return NextResponse.json(
        { error: 'Failed to update submission', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found or already reviewed', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('Error in PATCH /api/admin/submissions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
