import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin/auth';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  details?: string;
}

/**
 * GET /api/admin/health
 *
 * System health checks for the admin dashboard.
 * Checks: database connectivity, auth service, storage, key table counts.
 */
export async function GET() {
  try {
    const result = await verifyAdmin();
    if (result.error) return result.error;

    const checks: HealthCheck[] = [];

    // 1. Database connectivity + latency
    const dbStart = Date.now();
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    const dbLatency = Date.now() - dbStart;

    checks.push({
      name: 'database',
      status: dbError ? 'down' : dbLatency > 2000 ? 'degraded' : 'healthy',
      latencyMs: dbLatency,
      details: dbError ? dbError.message : undefined,
    });

    // 2. Auth service
    const authStart = Date.now();
    const { error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const authLatency = Date.now() - authStart;

    checks.push({
      name: 'auth',
      status: authError ? 'down' : authLatency > 3000 ? 'degraded' : 'healthy',
      latencyMs: authLatency,
      details: authError ? authError.message : undefined,
    });

    // 3. Key table counts (quick health snapshot)
    const [
      profilesResult,
      vetsResult,
      consultationsResult,
      activeSubsResult,
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'vet'),
      supabaseAdmin.from('consultations').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const tableCounts = {
      customers: profilesResult.count || 0,
      vets: vetsResult.count || 0,
      consultations: consultationsResult.count || 0,
      activeSubscriptions: activeSubsResult.count || 0,
    };

    // 4. Check for pending/stuck consultations (indicator of system issues)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: stuckCount } = await supabaseAdmin
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'matching'])
      .lt('created_at', oneHourAgo);

    if ((stuckCount || 0) > 0) {
      checks.push({
        name: 'consultation_queue',
        status: 'degraded',
        latencyMs: 0,
        details: `${stuckCount} consultation(s) stuck in pending/matching for >1 hour`,
      });
    } else {
      checks.push({
        name: 'consultation_queue',
        status: 'healthy',
        latencyMs: 0,
      });
    }

    // Overall status
    const overallStatus = checks.some((c) => c.status === 'down')
      ? 'down'
      : checks.some((c) => c.status === 'degraded')
        ? 'degraded'
        : 'healthy';

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      tableCounts,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/health:', error);
    return NextResponse.json(
      {
        status: 'down',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}
