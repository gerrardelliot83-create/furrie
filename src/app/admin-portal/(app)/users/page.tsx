import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import styles from './page.module.css';

export const maxDuration = 15;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: `Admin ${t('users')}`,
  };
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminUsersPage() {
  const t = await getTranslations('nav');
  const supabase = await createClient();

  // Fetch all customers with pet count
  const { data: users, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      avatar_url,
      created_at,
      pets (id)
    `)
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  // Fetch active subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('customer_id, status')
    .eq('status', 'active');

  const activeSubscriptionIds = new Set(
    (subscriptions || []).map((s) => s.customer_id)
  );

  const userList = users || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {t('users')}{' '}
          <span className={styles.count}>({userList.length})</span>
        </h1>
      </div>

      {userList.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No customers registered yet.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Pets</th>
              <th>Subscription</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((user) => {
              const petCount = Array.isArray(user.pets) ? user.pets.length : 0;
              const isPlus = activeSubscriptionIds.has(user.id);

              return (
                <tr key={user.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <div className={styles.avatar}>
                        {getInitials(user.full_name)}
                      </div>
                      <span>{user.full_name || 'Unnamed'}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone || '-'}</td>
                  <td>{petCount}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        isPlus ? styles.badgeActive : styles.badgeInactive
                      }`}
                    >
                      {isPlus ? 'Plus' : 'Free'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {error && (
        <p style={{ color: 'var(--color-error)' }}>
          Failed to load users: {error.message}
        </p>
      )}
    </div>
  );
}
