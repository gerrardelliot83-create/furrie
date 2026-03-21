import styles from './LoadingSkeleton.module.css';

interface SkeletonLineProps {
  width?: string;
  height?: string;
  style?: React.CSSProperties;
}

function Line({ width = '100%', height = '16px', style }: SkeletonLineProps) {
  return <div className={styles.line} style={{ width, height, ...style }} />;
}

function Circle({ size = 40 }: { size?: number }) {
  return <div className={styles.circle} style={{ width: size, height: size }} />;
}

function Block({ width = '100%', height = '40px' }: { width?: string; height?: string }) {
  return <div className={styles.block} style={{ width, height }} />;
}

/**
 * Generic list loading skeleton — shows N card placeholders
 */
export function ListSkeleton({ count = 3, wide = false }: { count?: number; wide?: boolean }) {
  return (
    <div className={wide ? styles.containerWide : styles.container}>
      <div className={styles.header}>
        <Line width="200px" height="28px" />
      </div>
      <div className={styles.cardGrid}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardRow}>
              <Circle size={40} />
              <div style={{ flex: 1 }}>
                <Line width="60%" height="16px" />
                <Line width="40%" height="14px" style={{ marginTop: 8 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Generic table loading skeleton — for admin/data pages
 */
export function TableSkeleton({ rows = 5, wide = true }: { rows?: number; wide?: boolean }) {
  return (
    <div className={wide ? styles.containerWide : styles.container}>
      <div className={styles.sectionHeader}>
        <Line width="200px" height="28px" />
        <Block width="120px" height="36px" />
      </div>
      <div className={styles.card}>
        {/* Table header */}
        <div className={styles.tableRow}>
          <Line width="20%" height="14px" />
          <Line width="25%" height="14px" />
          <Line width="20%" height="14px" />
          <Line width="15%" height="14px" />
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={styles.tableRow}>
            <Line width="20%" height="16px" />
            <Line width="25%" height="16px" />
            <Line width="20%" height="16px" />
            <Line width="15%" height="16px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Profile/detail page loading skeleton
 */
export function DetailSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={wide ? styles.containerWide : styles.container}>
      <div className={styles.header}>
        <Line width="180px" height="28px" />
      </div>
      <div className={styles.card}>
        <div className={styles.cardRow} style={{ marginBottom: 16 }}>
          <Circle size={64} />
          <div style={{ flex: 1 }}>
            <Line width="50%" height="20px" />
            <Line width="30%" height="14px" style={{ marginTop: 8 }} />
          </div>
        </div>
        <div className={styles.section}>
          <Line width="100%" height="14px" />
          <Line width="80%" height="14px" style={{ marginTop: 8 }} />
          <Line width="60%" height="14px" style={{ marginTop: 8 }} />
        </div>
      </div>
    </div>
  );
}
