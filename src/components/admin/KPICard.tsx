import styles from './KPICard.module.css';

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  icon?: 'users' | 'vets' | 'consultations' | 'revenue';
}

export function KPICard({ label, value, trend, icon }: KPICardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.iconContainer}>
        {icon && <KPIIcon type={icon} />}
      </div>
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {trend && (
          <p className={`${styles.trend} ${styles[`trend${trend.direction}`]}`}>
            {trend.direction === 'up' && '+'}
            {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}

function KPIIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    users: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    vets: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    consultations: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    revenue: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  };

  return (
    <span className={styles.icon}>
      {icons[type] || icons.users}
    </span>
  );
}
