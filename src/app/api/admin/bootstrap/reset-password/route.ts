import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/admin/bootstrap/reset-password
 *
 * Reset password for the bootstrapped admin account.
 * Requires the same ADMIN_BOOTSTRAP_SECRET.
 *
 * Usage:
 *   fetch("/api/admin/bootstrap/reset-password", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ email: "admin@example.com", password: "newpass", secret: "..." })
 *   })
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.email || !body.password || !body.secret) {
      return NextResponse.json(
        { error: 'email, password, and secret are required' },
        { status: 400 }
      );
    }

    const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!bootstrapSecret || body.secret !== bootstrapSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    // Find the user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const user = existingUsers?.users?.find((u) => u.email === body.email);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify they are an admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'User is not an admin' }, { status: 403 });
    }

    // Update password
    const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: body.password,
    });

    if (pwError) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ message: `Password updated for ${body.email}` });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
