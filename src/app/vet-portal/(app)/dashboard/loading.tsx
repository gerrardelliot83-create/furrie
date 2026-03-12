import styles from './DashboardLoading.module.css';

export default function VetDashboardLoading() {
  return (
    <div className={styles.container}>
      {/* Stats row skeleton */}
      <div className={styles.statsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.skeletonLine} style={{ width: '60%', height: '14px' }} />
            <div className={styles.skeletonLine} style={{ width: '40%', height: '28px', marginTop: '8px' }} />
          </div>
        ))}
      </div>

      {/* Today's schedule skeleton */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.skeletonLine} style={{ width: '160px', height: '20px' }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.scheduleCard}>
            <div className={styles.scheduleRow}>
              <div className={styles.skeletonLine} style={{ width: '80px', height: '16px' }} />
              <div className={styles.skeletonLine} style={{ width: '120px', height: '16px' }} />
            </div>
            <div className={styles.skeletonLine} style={{ width: '70%', height: '14px', marginTop: '8px' }} />
          </div>
        ))}
      </div>

      {/* Recent consultations skeleton */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.skeletonLine} style={{ width: '200px', height: '20px' }} />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className={styles.consultationRow}>
            <div className={styles.skeletonCircle} />
            <div className={styles.consultationInfo}>
              <div className={styles.skeletonLine} style={{ width: '50%', height: '16px' }} />
              <div className={styles.skeletonLine} style={{ width: '30%', height: '14px', marginTop: '4px' }} />
            </div>
            <div className={styles.skeletonLine} style={{ width: '70px', height: '24px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
