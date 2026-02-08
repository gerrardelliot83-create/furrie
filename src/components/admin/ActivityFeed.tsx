import type { ActivityItem } from '@/lib/admin/stats';
import { formatRelativeTime } from '@/lib/admin/stats';
import styles from './ActivityFeed.module.css';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className={styles.feed}>
      {activities.map((activity) => (
        <div key={activity.id} className={styles.item}>
          <div className={styles.iconWrapper}>
            <ActivityIcon type={activity.type} />
          </div>
          <div className={styles.content}>
            <p className={styles.description}>{activity.description}</p>
            <p className={styles.timestamp}>{formatRelativeTime(activity.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  const iconColors: Record<ActivityItem['type'], string> = {
    user_signup: 'var(--color-success)',
    consultation_started: 'var(--color-link)',
    consultation_completed: 'var(--color-primary)',
    vet_verified: 'var(--color-accent)',
    payment_received: 'var(--color-success)',
  };

  const icons: Record<ActivityItem['type'], React.ReactNode> = {
    user_signup: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    consultation_started: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
      </svg>
    ),
    consultation_completed: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    vet_verified: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    payment_received: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  };

  return (
    <span className={styles.icon} style={{ backgroundColor: iconColors[type] }}>
      {icons[type]}
    </span>
  );
}
