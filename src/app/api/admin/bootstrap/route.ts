import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/admin/bootstrap
 *
 * Bootstrap the FIRST admin account. This endpoint:
 * 1. Checks if ANY admin exists — if yes, returns 403 (use normal admin flow)
 * 2. Requires ADMIN_BOOTSTRAP_SECRET env var to match request secret
 * 3. Creates auth user + sets profile role to 'admin'
 *
 * Security:
 * - Only works when zero admins exist (one-time use)
 * - Requires a secret that only the server operator knows
 * - Uses service role (server-side only)
 *
 * Usage:
 *   curl -X POST https://your-domain.com/api/admin/bootstrap \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"admin@furrie.in","password":"...","fullName":"Admin","secret":"your-bootstrap-secret"}'
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.fullName || !body.secret) {
      return NextResponse.json(
        { error: 'email, password, fullName, and secret are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (body.password.length < 8) {
      return NextResponse.json(
        { error: 'Admin password must be at least 8 characters', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify bootstrap secret
    const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!bootstrapSecret) {
      return NextResponse.json(
        { error: 'ADMIN_BOOTSTRAP_SECRET is not configured on the server', code: 'NOT_CONFIGURED' },
        { status: 500 }
      );
    }

    if (body.secret !== bootstrapSecret) {
      return NextResponse.json(
        { error: 'Invalid bootstrap secret', code: 'INVALID_SECRET' },
        { status: 403 }
      );
    }

    // Check if any admin already exists
    const { count: adminCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (adminCount && adminCount > 0) {
      return NextResponse.json(
        {
          error: 'An admin account already exists. Use the admin portal to create additional admins.',
          code: 'ADMIN_EXISTS',
        },
        { status: 403 }
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
        // User exists but isn't admin — upgrade them
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u) => u.email === body.email);

        if (existingUser) {
          // Update password and sync app_metadata.role for existing user
          const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: body.password,
            app_metadata: { role: 'admin' },
          });

          if (pwError) {
            return NextResponse.json(
              { error: 'Failed to update password for existing user', code: 'PASSWORD_ERROR' },
              { status: 500 }
            );
          }

          const { error: upgradeError } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'admin', full_name: body.fullName })
            .eq('id', existingUser.id);

          if (upgradeError) {
            return NextResponse.json(
              { error: 'Failed to upgrade existing user to admin', code: 'UPGRADE_ERROR' },
              { status: 500 }
            );
          }

          return NextResponse.json({
            message: `Existing user ${body.email} upgraded to admin role`,
            adminId: existingUser.id,
          });
        }
      }

      console.error('Error creating admin auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to create admin account', code: 'AUTH_ERROR' },
        { status: 500 }
      );
    }

    const adminId = authData.user.id;

    // Update profile to admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'admin',
        full_name: body.fullName,
        phone: body.phone || null,
      })
      .eq('id', adminId);

    if (profileError) {
      console.error('Error setting admin role:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(adminId);
      return NextResponse.json(
        { error: 'Failed to set admin role on profile', code: 'PROFILE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `Admin account created for ${body.fullName} (${body.email}). You can now log in at the admin portal.`,
        adminId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/bootstrap:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
