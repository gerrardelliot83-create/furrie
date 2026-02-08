// Dashboard.tsx - Vet Portal Dashboard
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
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px',
    maxWidth: '1000px',
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
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  // Status toggle
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  statusTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#303344',
    margin: 0,
  },
  toggleSwitch: {
    width: '48px',
    height: '28px',
    backgroundColor: '#E5E7EB',
    borderRadius: '9999px',
    position: 'relative' as const,
    cursor: 'pointer',
  },
  toggleSwitchActive: {
    backgroundColor: '#059669',
  },
  toggleKnob: {
    width: '24px',
    height: '24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '50%',
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s ease',
  },
  toggleKnobActive: {
    transform: 'translateX(20px)',
  },
  statusInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statusOnline: {
    backgroundColor: '#059669',
  },
  statusOffline: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: '16px',
    fontWeight: 600,
  },
  // Stats cards
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#303344',
    lineHeight: 1,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: 500,
  },
  statChange: {
    fontSize: '12px',
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statChangePositive: {
    color: '#059669',
  },
  statChangeNegative: {
    color: '#CE3E24',
  },
  // Queue panel
  queuePanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  },
  queueHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  queueTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  queueBadge: {
    padding: '4px 10px',
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 700,
  },
  queueItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  queueItemUrgent: {
    backgroundColor: '#FEF2F2',
    borderLeft: '4px solid #CE3E24',
  },
  queueAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 600,
    color: '#303344',
  },
  queueInfo: {
    flex: 1,
  },
  queuePetName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
    margin: '0 0 4px 0',
  },
  queueDetails: {
    fontSize: '13px',
    color: '#6B7280',
    margin: 0,
  },
  queueMeta: {
    textAlign: 'right' as const,
  },
  queueTime: {
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '4px',
  },
  queueSymptoms: {
    display: 'flex',
    gap: '6px',
  },
  symptomTag: {
    padding: '2px 8px',
    backgroundColor: '#F2EAC3',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#303344',
  },
  acceptButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  // Recent consultations
  recentList: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  },
  recentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  recentTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
    margin: 0,
  },
  viewAllLink: {
    fontSize: '14px',
    color: '#7796CC',
    fontWeight: 500,
    textDecoration: 'none',
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  recentAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
  },
  recentInfo: {
    flex: 1,
  },
  recentPet: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#303344',
    margin: '0 0 2px 0',
  },
  recentDate: {
    fontSize: '12px',
    color: '#6B7280',
    margin: 0,
  },
  recentStatus: {
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 600,
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  // Button
  buttonPrimary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: '#464A5C',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default function VetDashboard() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Vet Portal Dashboard
      </h1>

      {/* Full Dashboard Layout */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Full Dashboard (Online)</h2>
        <div style={styles.dashboardLayout}>
          {/* Page Header */}
          <div style={styles.pageHeader}>
            <h1 style={styles.pageTitle}>Dashboard</h1>
            <div style={styles.headerActions}>
              <button style={styles.buttonSecondary}>View Schedule</button>
              <button style={styles.buttonPrimary}>Start Manual Call</button>
            </div>
          </div>

          {/* Status Card */}
          <div style={styles.statusCard}>
            <div style={styles.statusHeader}>
              <h3 style={styles.statusTitle}>Your Status</h3>
              <div style={{ ...styles.toggleSwitch, ...styles.toggleSwitchActive }}>
                <div style={{ ...styles.toggleKnob, ...styles.toggleKnobActive }}></div>
              </div>
            </div>
            <div style={styles.statusInfo}>
              <div style={{ ...styles.statusDot, ...styles.statusOnline }}></div>
              <span style={{ ...styles.statusText, color: '#059669' }}>Online - Accepting Calls</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>12</div>
              <div style={styles.statLabel}>Today's Consultations</div>
              <div style={{ ...styles.statChange, ...styles.statChangePositive }}>
                <span>&#9650;</span> +3 from yesterday
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>3</div>
              <div style={styles.statLabel}>In Queue</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statValue, color: '#059669' }}>4.8</div>
              <div style={styles.statLabel}>Average Rating</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>14m</div>
              <div style={styles.statLabel}>Avg. Call Duration</div>
            </div>
          </div>

          {/* Queue Panel */}
          <div style={styles.queuePanel}>
            <div style={styles.queueHeader}>
              <h3 style={styles.queueTitle}>
                Waiting Queue
                <span style={styles.queueBadge}>3</span>
              </h3>
              <button style={styles.buttonSecondary}>Refresh</button>
            </div>
            <div style={styles.queueItem}>
              <div style={styles.queueAvatar}>M</div>
              <div style={styles.queueInfo}>
                <h4 style={styles.queuePetName}>Max (Golden Retriever)</h4>
                <p style={styles.queueDetails}>Owner: John Doe - Waiting 2 min</p>
              </div>
              <div style={styles.queueMeta}>
                <div style={styles.queueSymptoms}>
                  <span style={styles.symptomTag}>Loss of appetite</span>
                  <span style={styles.symptomTag}>Lethargy</span>
                </div>
              </div>
              <button style={styles.acceptButton}>Accept</button>
            </div>
            <div style={{ ...styles.queueItem, ...styles.queueItemUrgent }}>
              <div style={styles.queueAvatar}>B</div>
              <div style={styles.queueInfo}>
                <h4 style={styles.queuePetName}>Bella (Persian Cat)</h4>
                <p style={styles.queueDetails}>Owner: Jane Smith - Waiting 5 min</p>
              </div>
              <div style={styles.queueMeta}>
                <div style={styles.queueSymptoms}>
                  <span style={{ ...styles.symptomTag, backgroundColor: '#FEE2E2', color: '#CE3E24' }}>Vomiting</span>
                </div>
              </div>
              <button style={styles.acceptButton}>Accept</button>
            </div>
            <div style={styles.queueItem}>
              <div style={styles.queueAvatar}>R</div>
              <div style={styles.queueInfo}>
                <h4 style={styles.queuePetName}>Rocky (German Shepherd)</h4>
                <p style={styles.queueDetails}>Owner: Mike Wilson - Waiting 1 min</p>
              </div>
              <div style={styles.queueMeta}>
                <div style={styles.queueSymptoms}>
                  <span style={styles.symptomTag}>Skin irritation</span>
                </div>
              </div>
              <button style={styles.acceptButton}>Accept</button>
            </div>
          </div>

          {/* Recent Consultations */}
          <div style={styles.recentList}>
            <div style={styles.recentHeader}>
              <h3 style={styles.recentTitle}>Recent Consultations</h3>
              <a href="#" style={styles.viewAllLink}>View all</a>
            </div>
            <div style={styles.recentItem}>
              <div style={styles.recentAvatar}>L</div>
              <div style={styles.recentInfo}>
                <h4 style={styles.recentPet}>Luna (Labrador)</h4>
                <p style={styles.recentDate}>Today, 10:30 AM - 15 min</p>
              </div>
              <span style={{ ...styles.recentStatus, ...styles.statusCompleted }}>Completed</span>
            </div>
            <div style={styles.recentItem}>
              <div style={styles.recentAvatar}>C</div>
              <div style={styles.recentInfo}>
                <h4 style={styles.recentPet}>Charlie (Beagle)</h4>
                <p style={styles.recentDate}>Today, 9:15 AM - 12 min</p>
              </div>
              <span style={{ ...styles.recentStatus, ...styles.statusPending }}>Notes Pending</span>
            </div>
            <div style={styles.recentItem}>
              <div style={styles.recentAvatar}>M</div>
              <div style={styles.recentInfo}>
                <h4 style={styles.recentPet}>Milo (Siamese Cat)</h4>
                <p style={styles.recentDate}>Yesterday, 4:45 PM - 18 min</p>
              </div>
              <span style={{ ...styles.recentStatus, ...styles.statusCompleted }}>Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Offline State */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Offline State (Status Card)</h2>
        <div style={{ ...styles.statusCard, maxWidth: '400px' }}>
          <div style={styles.statusHeader}>
            <h3 style={styles.statusTitle}>Your Status</h3>
            <div style={styles.toggleSwitch}>
              <div style={styles.toggleKnob}></div>
            </div>
          </div>
          <div style={styles.statusInfo}>
            <div style={{ ...styles.statusDot, ...styles.statusOffline }}></div>
            <span style={{ ...styles.statusText, color: '#6B7280' }}>Offline - Not accepting calls</span>
          </div>
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '12px 0 0 0' }}>
            Toggle to start accepting consultation requests
          </p>
        </div>
      </div>

      {/* Empty Queue */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Empty Queue State</h2>
        <div style={{ ...styles.queuePanel, maxWidth: '600px' }}>
          <div style={styles.queueHeader}>
            <h3 style={styles.queueTitle}>
              Waiting Queue
              <span style={{ ...styles.queueBadge, backgroundColor: '#E5E7EB', color: '#6B7280' }}>0</span>
            </h3>
          </div>
          <div style={{ padding: '40px 20px', textAlign: 'center' as const }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#F2EAC3',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px',
            }}>&#128054;</div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#303344', margin: '0 0 8px 0' }}>
              No patients waiting
            </h4>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
              New consultation requests will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
