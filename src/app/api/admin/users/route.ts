import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendWelcomeEmail } from '@/lib/email';
import { verifyAdmin, logAdminAction } from '@/lib/admin/auth';

/**
 * GET /api/admin/users
 *
 * List all customers with pet count and subscription status.
 */
export async function GET(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = supabaseAdmin
      .from('profiles')
      .select(
        `
        id,
        full_name,
        email,
        phone,
        avatar_url,
        is_active,
        created_at,
        pets (id, name)
      `,
        { count: 'exact' }
      )
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.neq('is_active', false);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users', code: 'FETCH_ERROR' },
        { status: 500 }
      );
    }

    // Fetch active subscriptions in one query
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('customer_id, status')
      .eq('status', 'active');

    const activeSubscriptionIds = new Set(
      (subscriptions || []).map((s) => s.customer_id)
    );

    const enrichedUsers = (users || []).map((u) => ({
      ...u,
      petCount: Array.isArray(u.pets) ? u.pets.length : 0,
      hasActiveSubscription: activeSubscriptionIds.has(u.id),
    }));

    return NextResponse.json({
      users: enrichedUsers,
      total: count || 0,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

interface CreateUserBody {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

/**
 * POST /api/admin/users
 *
 * Create a customer account (admin-provisioned).
 * 1. Create auth user with email_confirm: true
 * 2. Update profile with full_name, phone
 * 3. Send welcome email
 */
export async function POST(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = (await request.json()) as CreateUserBody;

    if (!body.email) {
      return NextResponse.json(
        { error: 'email is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!body.password) {
      return NextResponse.json(
        { error: 'password is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!body.fullName) {
      return NextResponse.json(
        { error: 'fullName is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'A user with this email already exists', code: 'EMAIL_EXISTS' },
          { status: 409 }
        );
      }
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to create user account', code: 'AUTH_CREATE_ERROR' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Update profile (handle_new_user trigger already created profile with role='customer')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: body.fullName,
        phone: body.phone || null,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to set up profile', code: 'PROFILE_ERROR' },
        { status: 500 }
      );
    }

    // Send welcome email
    if (body.email) {
      const emailResult = await sendWelcomeEmail(body.email, {
        customerName: body.fullName,
      });
      if (!emailResult.success) {
        console.error('Failed to send welcome email:', emailResult.error);
      }
    }

    await logAdminAction({
      adminId: result.user.id,
      action: 'create_user',
      targetType: 'user',
      targetId: userId,
      details: { email: body.email, fullName: body.fullName },
    });

    return NextResponse.json(
      {
        user: {
          id: userId,
          email: body.email,
          fullName: body.fullName,
          phone: body.phone || null,
        },
        message: `Customer account created for ${body.fullName} (${body.email}).`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

interface UpdateUserBody {
  userId: string;
  fullName?: string;
  phone?: string;
  isActive?: boolean;
}

/**
 * PATCH /api/admin/users
 *
 * Update a customer's profile or deactivate (soft delete).
 * Body: { userId, ...fieldsToUpdate }
 */
export async function PATCH(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = (await request.json()) as UpdateUserBody;

    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify user exists and is a customer
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', body.userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (user.role !== 'customer') {
      return NextResponse.json(
        { error: 'User is not a customer', code: 'NOT_CUSTOMER' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.fullName !== undefined) updates.full_name = body.fullName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.isActive !== undefined) updates.is_active = body.isActive;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', body.userId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user', code: 'UPDATE_ERROR' },
        { status: 500 }
      );
    }

    const action = body.isActive === false ? 'deactivate_user' : 'update_user';
    await logAdminAction({
      adminId: result.user.id,
      action,
      targetType: 'user',
      targetId: body.userId,
      details: { ...updates, email: user.email },
    });

    return NextResponse.json({
      message: body.isActive === false
        ? `User ${user.full_name} has been deactivated`
        : `User ${user.full_name} updated successfully`,
    });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 *
 * Hard-delete a customer ONLY if they have zero consultations/payments/subscriptions.
 * Otherwise returns 409 and suggests deactivation.
 * Body: { userId }
 */
export async function DELETE(request: Request) {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify user exists and is a customer
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', body.userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (user.role !== 'customer') {
      return NextResponse.json(
        { error: 'User is not a customer. Use the vets endpoint for vet accounts.', code: 'NOT_CUSTOMER' },
        { status: 400 }
      );
    }

    // Check for data that blocks hard deletion (FK constraints without CASCADE)
    const [consultationsResult, paymentsResult, subscriptionsResult, carePlansResult] = await Promise.all([
      supabaseAdmin
        .from('consultations')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', body.userId),
      supabaseAdmin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', body.userId),
      supabaseAdmin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', body.userId),
      supabaseAdmin
        .from('care_plans')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', body.userId),
    ]);

    const totalData = (consultationsResult.count || 0) +
      (paymentsResult.count || 0) +
      (subscriptionsResult.count || 0) +
      (carePlansResult.count || 0);

    if (totalData > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete user with existing data. Use PATCH to deactivate instead.',
          code: 'HAS_DATA',
          details: {
            consultations: consultationsResult.count || 0,
            payments: paymentsResult.count || 0,
            subscriptions: subscriptionsResult.count || 0,
            carePlans: carePlansResult.count || 0,
          },
        },
        { status: 409 }
      );
    }

    // Safe to hard delete — cascades: profiles, pets, notifications, consultation_packs
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(body.userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user account', code: 'DELETE_ERROR' },
        { status: 500 }
      );
    }

    await logAdminAction({
      adminId: result.user.id,
      action: 'delete_user',
      targetType: 'user',
      targetId: body.userId,
      details: { email: user.email, fullName: user.full_name },
    });

    return NextResponse.json({
      message: `User ${user.full_name} (${user.email}) has been permanently deleted`,
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
