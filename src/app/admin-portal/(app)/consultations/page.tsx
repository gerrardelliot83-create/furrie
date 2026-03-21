import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import styles from './page.module.css';

export const maxDuration = 15;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('consultation');
  return {
    title: `Admin ${t('consultations')}`,
  };
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'scheduled':
      return styles.badgeScheduled;
    case 'active':
    case 'in_progress':
      return styles.badgeActive;
    case 'closed':
      return styles.badgeClosed;
    case 'pending':
    case 'matched':
      return styles.badgePending;
    default:
      return styles.badgeClosed;
  }
}

function getStatusLabel(status: string, outcome: string | null): string {
  if (status === 'closed' && outcome) {
    switch (outcome) {
      case 'success':
        return 'Completed';
      case 'missed':
        return 'Missed';
      case 'no_show':
        return 'No Show';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Closed';
    }
  }
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'active':
    case 'in_progress':
      return 'In Progress';
    case 'pending':
      return 'Pending';
    case 'matched':
      return 'Matched';
    default:
      return status;
  }
}

function getOutcomeBadgeClass(outcome: string | null): string {
  switch (outcome) {
    case 'missed':
    case 'no_show':
      return styles.badgeMissed;
    case 'cancelled':
      return styles.badgePending;
    default:
      return styles.badgeClosed;
  }
}

interface ConsultationRow {
  id: string;
  consultation_number: string | null;
  status: string;
  outcome: string | null;
  type: string;
  scheduled_at: string | null;
  amount_paid: number | null;
  created_at: string;
  customer: { full_name: string | null } | null;
  vet: { full_name: string | null } | null;
  pet: { name: string; species: string } | null;
}

export default async function AdminConsultationsPage() {
  const t = await getTranslations('consultation');
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('consultations')
    .select(`
      id,
      consultation_number,
      status,
      outcome,
      type,
      scheduled_at,
      amount_paid,
      created_at,
      customer:profiles!consultations_customer_id_fkey (full_name),
      vet:profiles!consultations_vet_id_fkey (full_name),
      pet:pets!consultations_pet_id_fkey (name, species)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  // Handle Supabase array returns for foreign key joins
  const consultations: ConsultationRow[] = (data || []).map((row) => ({
    ...row,
    customer: Array.isArray(row.customer) ? row.customer[0] ?? null : row.customer,
    vet: Array.isArray(row.vet) ? row.vet[0] ?? null : row.vet,
    pet: Array.isArray(row.pet) ? row.pet[0] ?? null : row.pet,
  }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {t('consultations')}{' '}
          <span className={styles.count}>({consultations.length})</span>
        </h1>
      </div>

      {consultations.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No consultations yet.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Vet</th>
              <th>Pet</th>
              <th>Type</th>
              <th>Status</th>
              <th>Scheduled</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {consultations.map((consultation) => {
              const statusLabel = getStatusLabel(consultation.status, consultation.outcome);
              const badgeClass =
                consultation.status === 'closed' && consultation.outcome && consultation.outcome !== 'success'
                  ? getOutcomeBadgeClass(consultation.outcome)
                  : getStatusBadgeClass(consultation.status);

              return (
                <tr key={consultation.id}>
                  <td>
                    <span className={styles.consultationNumber}>
                      {consultation.consultation_number || '-'}
                    </span>
                  </td>
                  <td>{consultation.customer?.full_name || 'Unknown'}</td>
                  <td>{consultation.vet?.full_name ? `Dr. ${consultation.vet.full_name}` : 'Unassigned'}</td>
                  <td>
                    {consultation.pet
                      ? `${consultation.pet.name} (${consultation.pet.species})`
                      : '-'}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {consultation.type?.replace('_', ' ') || '-'}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${badgeClass}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td>{formatDateTime(consultation.scheduled_at)}</td>
                  <td>
                    {consultation.amount_paid
                      ? formatCurrency(consultation.amount_paid)
                      : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {error && (
        <p style={{ color: 'var(--color-error)' }}>
          Failed to load consultations: {error.message}
        </p>
      )}
    </div>
  );
}
