'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  details?: string;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  checks: HealthCheck[];
}

const statusLabels = { healthy: 'All Systems Operational', degraded: 'Degraded', down: 'System Down' };
const statusColors = { healthy: 'var(--color-success)', degraded: 'var(--color-warning)', down: 'var(--color-error)' };

export function HealthIndicator() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/health')
      .then((r) => r.json())
      .then((data) => { setHealth(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.healthCard}>
        <span className={styles.healthDot} style={{ background: 'var(--color-text-tertiary)' }} />
        <span className={styles.healthLabel}>Checking...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className={styles.healthCard}>
        <span className={styles.healthDot} style={{ background: 'var(--color-error)' }} />
        <span className={styles.healthLabel}>Health check failed</span>
      </div>
    );
  }

  return (
    <div className={styles.healthCard}>
      <div className={styles.healthHeader}>
        <span className={styles.healthDot} style={{ background: statusColors[health.status] }} />
        <span className={styles.healthLabel}>{statusLabels[health.status]}</span>
      </div>
      <div className={styles.healthChecks}>
        {health.checks.map((check) => (
          <div key={check.name} className={styles.healthCheckRow}>
            <span className={styles.healthCheckDot} style={{ background: statusColors[check.status] }} />
            <span className={styles.healthCheckName}>{check.name}</span>
            <span className={styles.healthCheckLatency}>{check.latencyMs}ms</span>
            {check.details && <span className={styles.healthCheckDetails}>{check.details}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
