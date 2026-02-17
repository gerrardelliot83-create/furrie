import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPlusActivatedEmail } from '@/lib/email';

/**
 * Verify the requesting user is an admin.
 * Returns the user if admin, or a NextResponse error to return early.
 */
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
        { error: 'Forbidden: admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * GET /api/admin/subscriptions
 *
 * List subscriptions with optional filters.
 * Query params: status, customerId, petId, limit, offset
 */
export async function GET(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const petId = searchParams.get('petId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabaseAdmin
      .from('subscriptions')
      .select(
        `
        *,
        profiles!subscriptions_customer_id_fkey (
          id,
          full_name,
          email
        ),
        pets!subscriptions_pet_id_fkey (
          id,
          name,
          species,
          breed
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    if (petId) {
      query = query.eq('pet_id', petId);
    }

    const { data: subscriptions, error, count } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptions: subscriptions || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

interface CreateSubscriptionBody {
  customerId: string;
  petId: string;
  durationDays?: number;
}

/**
 * POST /api/admin/subscriptions
 *
 * Create a Plus subscription for a customer's pet.
 * Body: { customerId, petId, durationDays? (default 30) }
 */
export async function POST(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = (await request.json()) as CreateSubscriptionBody;

    // Validate required fields
    if (!body.customerId) {
      return NextResponse.json(
        { error: 'customerId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!body.petId) {
      return NextResponse.json(
        { error: 'petId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const durationDays = body.durationDays || 30;

    // Verify customer exists and has customer role
    const { data: customerProfile, error: customerError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', body.customerId)
      .single();

    if (customerError || !customerProfile) {
      return NextResponse.json(
        { error: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (customerProfile.role !== 'customer') {
      return NextResponse.json(
        { error: 'User is not a customer', code: 'NOT_CUSTOMER' },
        { status: 400 }
      );
    }

    // Verify pet exists and belongs to this customer
    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .select('id, name, owner_id')
      .eq('id', body.petId)
      .single();

    if (petError || !pet) {
      return NextResponse.json(
        { error: 'Pet not found', code: 'PET_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (pet.owner_id !== body.customerId) {
      return NextResponse.json(
        { error: 'Pet does not belong to this customer', code: 'PET_OWNER_MISMATCH' },
        { status: 400 }
      );
    }

    // Check for existing active Plus subscription (prevent duplicates)
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, expires_at')
      .eq('customer_id', body.customerId)
      .eq('pet_id', body.petId)
      .eq('status', 'active')
      .eq('plan_type', 'plus')
      .maybeSingle();

    if (existing) {
      // Check if it's still valid
      const isStillValid = !existing.expires_at || new Date(existing.expires_at) > new Date();
      if (isStillValid) {
        return NextResponse.json(
          {
            error: 'An active Plus subscription already exists for this pet',
            code: 'DUPLICATE_SUBSCRIPTION',
            existingSubscriptionId: existing.id,
          },
          { status: 409 }
        );
      }
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Create subscription
    const { data: subscription, error: createError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        customer_id: body.customerId,
        pet_id: body.petId,
        plan_type: 'plus',
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        pricing_factors: { source: 'manual_admin' },
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating subscription:', createError);
      return NextResponse.json(
        { error: 'Failed to create subscription', code: 'CREATE_ERROR' },
        { status: 500 }
      );
    }

    // Send Plus activated email to customer
    if (customerProfile.email) {
      const plusEmailResult = await sendPlusActivatedEmail(customerProfile.email, {
        customerName: customerProfile.full_name || 'there',
        petName: pet.name,
        expiresAt: expiresAt.toISOString(),
      });
      if (!plusEmailResult.success) {
        console.error('Failed to send Plus activated email:', plusEmailResult.error);
      }
    }

    return NextResponse.json(
      {
        subscription,
        message: `Plus subscription created for ${pet.name} (${customerProfile.full_name}), expires ${expiresAt.toISOString()}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/subscriptions
 *
 * Cancel a subscription by setting status to 'cancelled'.
 * Body: { subscriptionId }
 */
export async function DELETE(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = await request.json();

    if (!body.subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify subscription exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('id', body.subscriptionId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Subscription not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (existing.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled', code: 'ALREADY_CANCELLED' },
        { status: 400 }
      );
    }

    // Cancel subscription
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', body.subscriptionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel subscription', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscription: updated,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
