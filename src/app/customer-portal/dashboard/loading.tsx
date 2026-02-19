import styles from './DashboardLoading.module.css';

export default function DashboardLoading() {
  return (
    <div className={styles.container}>
      {/* Greeting skeleton */}
      <div className={styles.header}>
        <div className={styles.skeletonLine} style={{ width: '60%', height: '28px' }} />
      </div>

      {/* CTA skeleton */}
      <div className={styles.ctaSkeleton}>
        <div className={styles.skeletonLine} style={{ width: '70%', height: '20px' }} />
        <div className={styles.skeletonLine} style={{ width: '50%', height: '16px', marginTop: '8px' }} />
        <div className={styles.skeletonButton} />
      </div>

      {/* Pets section skeleton */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.skeletonLine} style={{ width: '100px', height: '20px' }} />
        </div>
        <div className={styles.petsGrid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.petCardSkeleton}>
              <div className={styles.skeletonCircle} />
              <div className={styles.skeletonLine} style={{ width: '80%', height: '14px' }} />
              <div className={styles.skeletonLine} style={{ width: '60%', height: '12px' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Consultations section skeleton */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.skeletonLine} style={{ width: '180px', height: '20px' }} />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className={styles.consultationSkeleton}>
            <div className={styles.skeletonLine} style={{ width: '40%', height: '16px' }} />
            <div className={styles.skeletonLine} style={{ width: '70%', height: '14px', marginTop: '8px' }} />
            <div className={styles.skeletonLine} style={{ width: '30%', height: '14px', marginTop: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
