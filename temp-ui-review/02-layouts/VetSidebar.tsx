// VetSidebar.tsx - Vet Portal Desktop Sidebar
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
  // Desktop layout frame
  desktopFrame: {
    width: '100%',
    maxWidth: '1200px',
    height: '600px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    display: 'flex',
    boxShadow: '0 4px 12px rgba(48, 51, 68, 0.1)',
  },
  // Sidebar
  sidebar: {
    width: '256px',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column' as const,
    flexShrink: 0,
  },
  sidebarCollapsed: {
    width: '72px',
  },
  // Sidebar header
  sidebarHeader: {
    height: '64px',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #E5E7EB',
  },
  logo: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1E5081',
  },
  logoBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6B7280',
    marginLeft: '8px',
    padding: '2px 8px',
    backgroundColor: '#F3F4F6',
    borderRadius: '4px',
  },
  // Status toggle
  statusToggle: {
    margin: '16px',
    padding: '12px',
    backgroundColor: '#F9F6E8',
    borderRadius: '10px',
  },
  statusToggleLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleSwitch: {
    width: '48px',
    height: '28px',
    backgroundColor: '#E5E7EB',
    borderRadius: '9999px',
    position: 'relative' as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
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
  statusText: {
    fontSize: '14px',
    fontWeight: 600,
  },
  statusOnline: {
    color: '#059669',
  },
  statusOffline: {
    color: '#6B7280',
  },
  // Navigation
  navSection: {
    flex: 1,
    padding: '8px',
    overflowY: 'auto' as const,
  },
  navGroup: {
    marginBottom: '16px',
  },
  navGroupTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    padding: '8px 12px 4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '2px',
    transition: 'background-color 0.15s ease',
  },
  navItemActive: {
    backgroundColor: 'rgba(30, 80, 129, 0.08)',
  },
  navItemHover: {
    backgroundColor: '#F3F4F6',
  },
  navIcon: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  navIconActive: {
    color: '#1E5081',
  },
  navIconInactive: {
    color: '#6B7280',
  },
  navLabel: {
    fontSize: '14px',
    fontWeight: 500,
    flex: 1,
  },
  navLabelActive: {
    color: '#1E5081',
    fontWeight: 600,
  },
  navLabelInactive: {
    color: '#464A5C',
  },
  navBadge: {
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // User section
  userSection: {
    padding: '12px',
    borderTop: '1px solid #E5E7EB',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#303344',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#303344',
  },
  userRole: {
    fontSize: '12px',
    color: '#6B7280',
  },
  // Main content
  mainContent: {
    flex: 1,
    backgroundColor: '#F9F6E8',
    padding: '24px',
    overflowY: 'auto' as const,
  },
  // Top header
  topHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#303344',
  },
};

export default function VetSidebar() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Vet Portal Desktop Layout
      </h1>

      {/* Full Desktop Layout */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Full Layout (Online)</h2>
        <div style={styles.desktopFrame}>
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <span style={styles.logo}>furrie</span>
              <span style={styles.logoBadge}>VET</span>
            </div>

            <div style={styles.statusToggle}>
              <div style={styles.statusToggleLabel}>Your Status</div>
              <div style={styles.toggleContainer}>
                <span style={{ ...styles.statusText, ...styles.statusOnline }}>Online</span>
                <div style={{ ...styles.toggleSwitch, ...styles.toggleSwitchActive }}>
                  <div style={{ ...styles.toggleKnob, ...styles.toggleKnobActive }}></div>
                </div>
              </div>
            </div>

            <div style={styles.navSection}>
              <div style={styles.navGroup}>
                <div style={{ ...styles.navItem, ...styles.navItemActive }}>
                  <span style={{ ...styles.navIcon, ...styles.navIconActive }}>&#127968;</span>
                  <span style={{ ...styles.navLabel, ...styles.navLabelActive }}>Dashboard</span>
                </div>
                <div style={styles.navItem}>
                  <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128197;</span>
                  <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Schedule</span>
                </div>
              </div>

              <div style={styles.navGroup}>
                <div style={styles.navGroupTitle}>Consultations</div>
                <div style={styles.navItem}>
                  <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#9200;</span>
                  <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Queue</span>
                  <span style={styles.navBadge}>3</span>
                </div>
                <div style={styles.navItem}>
                  <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128221;</span>
                  <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>History</span>
                </div>
                <div style={styles.navItem}>
                  <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#9888;</span>
                  <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Flagged</span>
                  <span style={{ ...styles.navBadge, backgroundColor: '#D97706' }}>1</span>
                </div>
              </div>

              <div style={styles.navGroup}>
                <div style={styles.navGroupTitle}>Settings</div>
                <div style={styles.navItem}>
                  <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128100;</span>
                  <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Profile</span>
                </div>
                <div style={styles.navItem}>
                  <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#9881;</span>
                  <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Preferences</span>
                </div>
              </div>
            </div>

            <div style={styles.userSection}>
              <div style={styles.userCard}>
                <div style={styles.userAvatar}>DR</div>
                <div>
                  <div style={styles.userName}>Dr. Rahul Singh</div>
                  <div style={styles.userRole}>Veterinarian</div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.mainContent}>
            <div style={styles.topHeader}>
              <h1 style={styles.pageTitle}>Dashboard</h1>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  color: '#464A5C',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}>View All</button>
                <button style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#1E5081',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}>New Report</button>
              </div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '24px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              Dashboard content area
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar States Side by Side */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Status Toggle States</h2>
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Online */}
          <div style={{ width: '256px', backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Online State</span>
            <div style={styles.statusToggle}>
              <div style={styles.statusToggleLabel}>Your Status</div>
              <div style={styles.toggleContainer}>
                <span style={{ ...styles.statusText, ...styles.statusOnline }}>Online</span>
                <div style={{ ...styles.toggleSwitch, ...styles.toggleSwitchActive }}>
                  <div style={{ ...styles.toggleKnob, ...styles.toggleKnobActive }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Offline */}
          <div style={{ width: '256px', backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Offline State</span>
            <div style={styles.statusToggle}>
              <div style={styles.statusToggleLabel}>Your Status</div>
              <div style={styles.toggleContainer}>
                <span style={{ ...styles.statusText, ...styles.statusOffline }}>Offline</span>
                <div style={styles.toggleSwitch}>
                  <div style={styles.toggleKnob}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Item States */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Navigation Item States</h2>
        <div style={{ display: 'flex', gap: '16px', backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', maxWidth: '800px' }}>
          <div style={{ width: '200px' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Default</span>
            <div style={styles.navItem}>
              <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#127968;</span>
              <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Dashboard</span>
            </div>
          </div>
          <div style={{ width: '200px' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Active</span>
            <div style={{ ...styles.navItem, ...styles.navItemActive }}>
              <span style={{ ...styles.navIcon, ...styles.navIconActive }}>&#127968;</span>
              <span style={{ ...styles.navLabel, ...styles.navLabelActive }}>Dashboard</span>
            </div>
          </div>
          <div style={{ width: '200px' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>With Badge</span>
            <div style={styles.navItem}>
              <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#9200;</span>
              <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Queue</span>
              <span style={styles.navBadge}>5</span>
            </div>
          </div>
          <div style={{ width: '200px' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Hover</span>
            <div style={{ ...styles.navItem, ...styles.navItemHover }}>
              <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128197;</span>
              <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Schedule</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
