import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import styles from './page.module.css';

export const maxDuration = 15;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return {
    title: `Admin ${t('vets')}`,
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

interface VetProfileRow {
  qualifications: string | null;
  vci_registration_number: string | null;
  specializations: string[] | null;
  years_of_experience: number | null;
  is_verified: boolean;
  is_available: boolean;
  consultation_count: number | null;
  average_rating: number | null;
}

export default async function AdminVetsPage() {
  const t = await getTranslations('nav');
  const supabase = await createClient();

  const { data: vets, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      created_at,
      vet_profiles (
        qualifications,
        vci_registration_number,
        specializations,
        years_of_experience,
        is_verified,
        is_available,
        consultation_count,
        average_rating
      )
    `)
    .eq('role', 'vet')
    .order('created_at', { ascending: false });

  const vetList = vets || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {t('vets')}{' '}
          <span className={styles.count}>({vetList.length})</span>
        </h1>
      </div>

      {vetList.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No vets registered yet.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>VCI Number</th>
              <th>Specializations</th>
              <th>Consultations</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {vetList.map((vet) => {
              // Supabase joins return arrays — handle gracefully
              const vetProfile: VetProfileRow | null = Array.isArray(vet.vet_profiles)
                ? (vet.vet_profiles[0] as VetProfileRow | undefined) ?? null
                : (vet.vet_profiles as unknown as VetProfileRow | null);

              return (
                <tr key={vet.id}>
                  <td>
                    <div className={styles.nameCell}>
                      <div className={styles.avatar}>
                        {getInitials(vet.full_name)}
                      </div>
                      <span>{vet.full_name || 'Unnamed'}</span>
                    </div>
                  </td>
                  <td>{vet.email}</td>
                  <td>{vetProfile?.vci_registration_number || '-'}</td>
                  <td>
                    {vetProfile?.specializations && vetProfile.specializations.length > 0 ? (
                      <div className={styles.specList}>
                        {vetProfile.specializations.slice(0, 3).map((spec) => (
                          <span key={spec} className={styles.specTag}>
                            {spec}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{vetProfile?.consultation_count ?? 0}</td>
                  <td>
                    {vetProfile?.average_rating
                      ? `${vetProfile.average_rating.toFixed(1)}/5`
                      : '-'}
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        vetProfile?.is_available
                          ? styles.badgeOnline
                          : styles.badgeOffline
                      }`}
                    >
                      {vetProfile?.is_available ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td>{formatDate(vet.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {error && (
        <p style={{ color: 'var(--color-error)' }}>
          Failed to load vets: {error.message}
        </p>
      )}
    </div>
  );
}
