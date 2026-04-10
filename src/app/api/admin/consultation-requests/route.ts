/**
 * /api/admin/consultation-requests
 *
 * GET ?status=pending|contacted|fulfilled|cancelled
 *   List all credit requests, filterable by status. Admin-only.
 *
 * PATCH
 *   Body: { requestId, action: 'contact'|'fulfill'|'cancel', packId?: string }
 *   Transition a request's status. Admin-only.
 *   - 'contact' → status='contacted'
 *   - 'fulfill' → status='fulfilled', requires packId (the admin assigns
 *      a pack via the existing Assign Pack modal first, then links it)
 *   - 'cancel' → status='cancelled'
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
      user: null,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      ),
      user: null,
    };
  }

  return { error: null, user };
}

export async function GET(request: Request) {
  try {
    const { error: authErr, user } = await verifyAdmin();
    if (authErr || !user) return authErr!;

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let query = supabaseAdmin
      .from('consultation_credit_requests')
      .select(`
        *,
        profiles!consultation_credit_requests_customer_id_fkey (
          id, full_name, email, phone
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter && ['pending', 'contacted', 'fulfilled', 'cancelled'].includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin credit requests fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch requests', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: data || [] });
  } catch (err) {
    console.error('GET /api/admin/consultation-requests error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

interface PatchBody {
  requestId?: string;
  action?: string;
  packId?: string;
}

export async function PATCH(request: Request) {
  try {
    const { error: authErr, user } = await verifyAdmin();
    if (authErr || !user) return authErr!;

    const body = (await request.json().catch(() => ({}))) as PatchBody;

    if (!body.requestId) {
      return NextResponse.json(
        { error: 'requestId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const validActions = ['contact', 'fulfill', 'cancel'];
    if (!body.action || !validActions.includes(body.action)) {
      return NextResponse.json(
        { error: 'action must be one of: contact, fulfill, cancel', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Load the request
    const { data: req, error: fetchErr } = await supabaseAdmin
      .from('consultation_credit_requests')
      .select('*')
      .eq('id', body.requestId)
      .single();

    if (fetchErr || !req) {
      return NextResponse.json(
        { error: 'Request not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};

    switch (body.action) {
      case 'contact':
        if (req.status !== 'pending') {
          return NextResponse.json(
            { error: 'Can only contact pending requests', code: 'INVALID_TRANSITION' },
            { status: 400 }
          );
        }
        updates.status = 'contacted';
        break;

      case 'fulfill':
        if (!body.packId) {
          return NextResponse.json(
            { error: 'packId is required to fulfill a request', code: 'VALIDATION_ERROR' },
            { status: 400 }
          );
        }
        // Verify the pack exists and belongs to the same customer
        const { data: pack } = await supabaseAdmin
          .from('consultation_packs')
          .select('id, customer_id')
          .eq('id', body.packId)
          .single();

        if (!pack) {
          return NextResponse.json(
            { error: 'Pack not found', code: 'PACK_NOT_FOUND' },
            { status: 404 }
          );
        }
        if (pack.customer_id !== req.customer_id) {
          return NextResponse.json(
            { error: 'Pack does not belong to the requesting customer', code: 'PACK_CUSTOMER_MISMATCH' },
            { status: 400 }
          );
        }
        updates.status = 'fulfilled';
        updates.fulfilled_pack_id = body.packId;
        updates.fulfilled_by_admin_id = user.id;
        updates.fulfilled_at = new Date().toISOString();
        break;

      case 'cancel':
        updates.status = 'cancelled';
        break;
    }

    const { error: updateErr } = await supabaseAdmin
      .from('consultation_credit_requests')
      .update(updates)
      .eq('id', body.requestId);

    if (updateErr) {
      console.error('Admin credit request update error:', updateErr);
      return NextResponse.json(
        { error: 'Failed to update request', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Request ${body.action === 'fulfill' ? 'fulfilled' : body.action === 'contact' ? 'marked as contacted' : 'cancelled'} successfully`,
    });
  } catch (err) {
    console.error('PATCH /api/admin/consultation-requests error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
