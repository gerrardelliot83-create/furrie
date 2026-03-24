import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import styles from './page.module.css';

export const maxDuration = 15;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Admin Subscriptions',
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active': return styles.badgeActive;
    case 'expired': return styles.badgeExpired;
    case 'cancelled': return styles.badgeCancelled;
    case 'payment_failed': return styles.badgeFailed;
    default: return styles.badgeExpired;
  }
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const statusFilter = params.status || undefined;

  let query = supabase
    .from('subscriptions')
    .select(`
      id,
      customer_id,
      pet_id,
      plan_type,
      status,
      starts_at,
      expires_at,
      created_at,
      profiles!subscriptions_customer_id_fkey (
        full_name,
        email
      ),
      pets!subscriptions_pet_id_fkey (
        name,
        species
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: subscriptions, error } = await query;

  const subList = subscriptions || [];
  const statusFilters = ['all', 'active', 'expired', 'cancelled', 'payment_failed'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Subscriptions{' '}
          <span className={styles.count}>({subList.length})</span>
        </h1>
      </div>

      <div className={styles.filters}>
        {statusFilters.map((s) => (
          <a
            key={s}
            href={s === 'all' ? '/subscriptions' : `/subscriptions?status=${s}`}
            className={`${styles.filterBtn} ${
              (s === 'all' && !statusFilter) || s === statusFilter
                ? styles.filterBtnActive
                : ''
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
          </a>
        ))}
      </div>

      {subList.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No subscriptions found{statusFilter ? ` with status "${statusFilter}"` : ''}.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Pet</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Started</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {subList.map((sub) => {
              const profile = Array.isArray(sub.profiles)
                ? sub.profiles[0]
                : sub.profiles;
              const pet = Array.isArray(sub.pets)
                ? sub.pets[0]
                : sub.pets;

              return (
                <tr key={sub.id}>
                  <td>
                    {(profile as { full_name: string | null } | null)?.full_name || 'Unknown'}
                    <br />
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                      {(profile as { email: string | null } | null)?.email || ''}
                    </span>
                  </td>
                  <td>
                    {(pet as { name: string } | null)?.name || 'Unknown'}
                    {(pet as { species: string | null } | null)?.species && (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                        {' '}({(pet as { species: string }).species})
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${sub.plan_type === 'plus' ? styles.badgePlus : styles.badgeFree}`}>
                      {sub.plan_type === 'plus' ? 'Plus' : 'Free'}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${getStatusBadgeClass(sub.status)}`}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1).replace('_', ' ')}
                    </span>
                  </td>
                  <td>{formatDate(sub.starts_at)}</td>
                  <td>{formatDate(sub.expires_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {error && (
        <p style={{ color: 'var(--color-error)' }}>
          Failed to load subscriptions: {error.message}
        </p>
      )}
    </div>
  );
}
