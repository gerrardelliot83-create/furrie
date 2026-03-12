import styles from './PetsLoading.module.css';

export default function PetsLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.skeletonLine} style={{ width: '120px', height: '24px' }} />
        <div className={styles.skeletonButton} />
      </div>

      <div className={styles.grid}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.card}>
            <div className={styles.skeletonImage} />
            <div className={styles.cardBody}>
              <div className={styles.skeletonLine} style={{ width: '60%', height: '18px' }} />
              <div className={styles.skeletonLine} style={{ width: '80%', height: '14px', marginTop: '8px' }} />
              <div className={styles.skeletonLine} style={{ width: '40%', height: '14px', marginTop: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
