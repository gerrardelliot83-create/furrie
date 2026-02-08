// Dashboard.tsx - Admin Portal Dashboard
// Copy this file to Claude Desktop and ask: "Please render this as a React artifact"

const styles = {
  container: {
    fontFamily: "'Epilogue', -apple-system, sans-serif",
    padding: '24px',
    backgroundColor: '#F9F6E8',
    minHeight: '100vh',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '16px',
  },
  // Dashboard layout
  dashboardLayout: {
    maxWidth: '1200px',
  },
  // Page header
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#303344',
    margin: 0,
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#303344',
    cursor: 'pointer',
  },
  // KPI Cards
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
  },
  kpiHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  kpiLabel: {
    fontSize: '13px',
    color: '#6B7280',
    fontWeight: 500,
  },
  kpiIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  kpiValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#303344',
    marginBottom: '4px',
  },
  kpiChange: {
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  kpiChangePositive: {
    color: '#059669',
  },
  kpiChangeNegative: {
    color: '#CE3E24',
  },
  // Charts section
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
    margin: 0,
  },
  chartPlaceholder: {
    height: '200px',
    backgroundColor: '#F9F6E8',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9CA3AF',
    fontSize: '14px',
  },
  // Activity feed
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  },
  activityHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  activityTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
    margin: 0,
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  activityIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: '14px',
    color: '#303344',
    margin: '0 0 4px 0',
    lineHeight: 1.4,
  },
  activityTime: {
    fontSize: '12px',
    color: '#9CA3AF',
    margin: 0,
  },
  // Tables
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  tableTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
    margin: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px 20px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  td: {
    padding: '12px 20px',
    fontSize: '14px',
    color: '#303344',
    borderBottom: '1px solid #E5E7EB',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 600,
  },
  statusOnline: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  statusOffline: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  // Button
  buttonPrimary: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: '#464A5C',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  viewAllLink: {
    fontSize: '14px',
    color: '#7796CC',
    fontWeight: 500,
    textDecoration: 'none',
  },
};

export default function AdminDashboard() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Admin Portal Dashboard
      </h1>

      <div style={styles.dashboardLayout}>
        {/* Page Header */}
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Dashboard</h1>
          <div style={styles.dateRange}>
            <span>&#128197;</span>
            Last 7 days
            <span>&#9660;</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiLabel}>Total Consultations</span>
              <div style={{ ...styles.kpiIcon, backgroundColor: '#DBEAFE', color: '#1E5081' }}>&#128196;</div>
            </div>
            <div style={styles.kpiValue}>1,247</div>
            <div style={{ ...styles.kpiChange, ...styles.kpiChangePositive }}>
              <span>&#9650;</span> 12% from last week
            </div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiLabel}>Active Users</span>
              <div style={{ ...styles.kpiIcon, backgroundColor: '#D1FAE5', color: '#059669' }}>&#128101;</div>
            </div>
            <div style={styles.kpiValue}>3,892</div>
            <div style={{ ...styles.kpiChange, ...styles.kpiChangePositive }}>
              <span>&#9650;</span> 8% from last week
            </div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiLabel}>Revenue</span>
              <div style={{ ...styles.kpiIcon, backgroundColor: '#FEF3C7', color: '#D97706' }}>&#8377;</div>
            </div>
            <div style={styles.kpiValue}>Rs. 6.2L</div>
            <div style={{ ...styles.kpiChange, ...styles.kpiChangePositive }}>
              <span>&#9650;</span> 15% from last week
            </div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiLabel}>Avg. Rating</span>
              <div style={{ ...styles.kpiIcon, backgroundColor: '#F2EAC3', color: '#303344' }}>&#9733;</div>
            </div>
            <div style={styles.kpiValue}>4.7</div>
            <div style={{ ...styles.kpiChange, ...styles.kpiChangeNegative }}>
              <span>&#9660;</span> 0.1 from last week
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div style={styles.chartsGrid}>
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>Consultations Over Time</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={styles.buttonSecondary}>Daily</button>
                <button style={{ ...styles.buttonSecondary, backgroundColor: '#F3F4F6' }}>Weekly</button>
                <button style={styles.buttonSecondary}>Monthly</button>
              </div>
            </div>
            <div style={styles.chartPlaceholder}>
              [Line Chart Placeholder]
            </div>
          </div>
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>Pet Types</h3>
            </div>
            <div style={styles.chartPlaceholder}>
              [Pie Chart Placeholder]
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#FEF3C7', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '13px', color: '#464A5C' }}>Dogs (62%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#E0E7FF', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '13px', color: '#464A5C' }}>Cats (38%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity and Vets Table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Activity Feed */}
          <div style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <h3 style={styles.activityTitle}>Recent Activity</h3>
              <a href="#" style={styles.viewAllLink}>View all</a>
            </div>
            <div style={styles.activityItem}>
              <div style={{ ...styles.activityIcon, backgroundColor: '#D1FAE5', color: '#059669' }}>&#10003;</div>
              <div style={styles.activityContent}>
                <p style={styles.activityText}>
                  <strong>Dr. Rahul Singh</strong> completed consultation with Max
                </p>
                <p style={styles.activityTime}>2 minutes ago</p>
              </div>
            </div>
            <div style={styles.activityItem}>
              <div style={{ ...styles.activityIcon, backgroundColor: '#DBEAFE', color: '#1E5081' }}>&#128100;</div>
              <div style={styles.activityContent}>
                <p style={styles.activityText}>
                  New user <strong>Jane Smith</strong> registered
                </p>
                <p style={styles.activityTime}>15 minutes ago</p>
              </div>
            </div>
            <div style={styles.activityItem}>
              <div style={{ ...styles.activityIcon, backgroundColor: '#FEF3C7', color: '#D97706' }}>&#8377;</div>
              <div style={styles.activityContent}>
                <p style={styles.activityText}>
                  Payment of <strong>Rs. 499</strong> received from John Doe
                </p>
                <p style={styles.activityTime}>32 minutes ago</p>
              </div>
            </div>
            <div style={styles.activityItem}>
              <div style={{ ...styles.activityIcon, backgroundColor: '#FEE2E2', color: '#CE3E24' }}>&#9888;</div>
              <div style={styles.activityContent}>
                <p style={styles.activityText}>
                  Consultation <strong>#1234</strong> was flagged by Dr. Priya Sharma
                </p>
                <p style={styles.activityTime}>1 hour ago</p>
              </div>
            </div>
          </div>

          {/* Vets Table */}
          <div style={styles.tableCard}>
            <div style={styles.tableHeader}>
              <h3 style={styles.tableTitle}>Veterinarians</h3>
              <a href="#" style={styles.viewAllLink}>Manage</a>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Today</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#F2EAC3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>RS</div>
                      Dr. Rahul Singh
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...styles.statusOnline }}>Online</span>
                  </td>
                  <td style={styles.td}>8</td>
                </tr>
                <tr>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#F2EAC3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>PS</div>
                      Dr. Priya Sharma
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...styles.statusOnline }}>Online</span>
                  </td>
                  <td style={styles.td}>6</td>
                </tr>
                <tr>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#F2EAC3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>AK</div>
                      Dr. Amit Kumar
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...styles.statusOffline }}>Offline</span>
                  </td>
                  <td style={styles.td}>0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
