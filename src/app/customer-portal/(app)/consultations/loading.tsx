import styles from './ConsultationsLoading.module.css';

export default function ConsultationsLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.skeletonLine} style={{ width: '180px', height: '24px' }} />
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.skeletonLine} style={{ width: '50%', height: '16px' }} />
            <div className={styles.skeletonLine} style={{ width: '80px', height: '24px' }} />
          </div>
          <div className={styles.skeletonLine} style={{ width: '70%', height: '14px', marginTop: '12px' }} />
          <div className={styles.skeletonLine} style={{ width: '40%', height: '14px', marginTop: '8px' }} />
        </div>
      ))}
    </div>
  );
}
