// Admin Dashboard Statistics
// Server-side functions for fetching KPI data

import { createClient } from '@/lib/supabase/server';

export interface DashboardStats {
  totalUsers: number;
  activeVets: number;
  todayConsultations: number;
  monthRevenue: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'user_signup' | 'consultation_started' | 'consultation_completed' | 'vet_verified' | 'payment_received';
  description: string;
  timestamp: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // Get first day of month
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstOfMonthIso = firstOfMonth.toISOString();

  // Fetch all stats in parallel
  const [
    usersResult,
    vetsResult,
    todayConsultationsResult,
    monthRevenueResult,
  ] = await Promise.all([
    // Total users (customers only)
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'customer'),

    // Active vets (verified and available)
    supabase
      .from('vet_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_verified', true)
      .eq('is_available', true),

    // Today's consultations
    supabase
      .from('consultations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayIso),

    // Month's revenue
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', firstOfMonthIso),
  ]);

  // Calculate month revenue
  const monthRevenue = monthRevenueResult.data?.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  ) || 0;

  // Fetch recent activity
  const recentActivity = await getRecentActivity(supabase);

  return {
    totalUsers: usersResult.count || 0,
    activeVets: vetsResult.count || 0,
    todayConsultations: todayConsultationsResult.count || 0,
    monthRevenue,
    recentActivity,
  };
}

async function getRecentActivity(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];

  // Get recent consultations
  const { data: consultations } = await supabase
    .from('consultations')
    .select('id, status, created_at, started_at, ended_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (consultations) {
    for (const c of consultations) {
      if (c.status === 'completed' && c.ended_at) {
        activities.push({
          id: `consult-completed-${c.id}`,
          type: 'consultation_completed',
          description: `Consultation ${c.id.substring(0, 8)} completed`,
          timestamp: c.ended_at,
        });
      } else if (c.status === 'in_progress' && c.started_at) {
        activities.push({
          id: `consult-started-${c.id}`,
          type: 'consultation_started',
          description: `Consultation ${c.id.substring(0, 8)} started`,
          timestamp: c.started_at,
        });
      }
    }
  }

  // Get recent user signups
  const { data: users } = await supabase
    .from('profiles')
    .select('id, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .limit(3);

  if (users) {
    for (const u of users) {
      activities.push({
        id: `user-${u.id}`,
        type: 'user_signup',
        description: `New customer signed up`,
        timestamp: u.created_at,
      });
    }
  }

  // Get recent payments
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(3);

  if (payments) {
    for (const p of payments) {
      activities.push({
        id: `payment-${p.id}`,
        type: 'payment_received',
        description: `Payment of ₹${p.amount} received`,
        timestamp: p.created_at,
      });
    }
  }

  // Sort by timestamp and limit to 10
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
