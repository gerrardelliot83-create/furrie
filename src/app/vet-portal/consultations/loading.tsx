import styles from './ConsultationsLoading.module.css';

export default function VetConsultationsLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.skeletonLine} style={{ width: '180px', height: '24px' }} />
      </div>

      {/* Filter tabs skeleton */}
      <div className={styles.tabs}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonTab} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          {['20%', '15%', '15%', '12%', '12%', '10%'].map((width, i) => (
            <div key={i} className={styles.skeletonLine} style={{ width, height: '14px' }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.tableRow}>
            <div className={styles.skeletonLine} style={{ width: '80%', height: '14px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
