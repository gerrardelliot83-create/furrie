/**
 * /api/consultation-requests
 *
 * POST — Customer submits a request for more consultations.
 *   Body: { quantity: number, preferredContact?: string, contactPhone?: string, note?: string }
 *   Enforces max 1 pending request per customer (DB unique partial index).
 *
 * GET — Customer fetches their own requests (pending first, then recent).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RequestBody {
  quantity?: number;
  preferredContact?: string;
  contactPhone?: string;
  note?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const quantity = body.quantity;

    if (!quantity || quantity < 1 || quantity > 50 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: 'quantity must be an integer between 1 and 50', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const validContacts = ['phone', 'email', 'whatsapp'];
    const preferredContact = body.preferredContact && validContacts.includes(body.preferredContact)
      ? body.preferredContact
      : null;

    const { data: inserted, error: insertError } = await supabase
      .from('consultation_credit_requests')
      .insert({
        customer_id: user.id,
        requested_quantity: quantity,
        preferred_contact: preferredContact,
        contact_phone: body.contactPhone?.trim() || null,
        note: body.note?.trim()?.slice(0, 500) || null,
      })
      .select('id, requested_quantity, status, created_at')
      .single();

    if (insertError) {
      // Unique index violation → already has a pending request
      if (
        insertError.code === '23505' ||
        insertError.message?.includes('uq_one_pending_request_per_customer')
      ) {
        return NextResponse.json(
          {
            error: 'You already have a pending request. Please wait for our team to contact you.',
            code: 'DUPLICATE_REQUEST',
          },
          { status: 409 }
        );
      }
      console.error('Credit request insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit request', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ request: inserted }, { status: 201 });
  } catch (err) {
    console.error('POST /api/consultation-requests error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { data: requests, error } = await supabase
      .from('consultation_credit_requests')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Credit requests fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch requests', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (err) {
    console.error('GET /api/consultation-requests error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
