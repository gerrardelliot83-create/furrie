// CustomerNav.tsx - Mobile Bottom Navigation
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
  // Phone frame
  phoneFrame: {
    width: '320px',
    height: '568px',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    border: '8px solid #303344',
    overflow: 'hidden',
    position: 'relative' as const,
    boxShadow: '0 20px 40px rgba(48, 51, 68, 0.2)',
  },
  // Header
  header: {
    height: '56px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
  },
  headerLogo: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1E5081',
  },
  headerIcon: {
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
  // Content area
  content: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#F9F6E8',
    height: 'calc(100% - 56px - 72px)',
    overflowY: 'auto' as const,
  },
  // Bottom navigation
  bottomNav: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '72px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 8px',
    paddingBottom: '8px', // Safe area
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: '8px',
    minWidth: '64px',
  },
  navItemActive: {
    backgroundColor: 'rgba(30, 80, 129, 0.08)',
  },
  navIcon: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  navIconActive: {
    color: '#1E5081',
  },
  navIconInactive: {
    color: '#9CA3AF',
  },
  navLabel: {
    fontSize: '11px',
    fontWeight: 500,
  },
  navLabelActive: {
    color: '#1E5081',
  },
  navLabelInactive: {
    color: '#6B7280',
  },
  // Connect button (center, elevated)
  connectButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
  },
  connectCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    boxShadow: '0 4px 12px rgba(206, 62, 36, 0.3)',
    marginTop: '-12px',
  },
  // Badge on nav item
  navBadge: {
    position: 'absolute' as const,
    top: '-2px',
    right: '-2px',
    minWidth: '16px',
    height: '16px',
    padding: '0 4px',
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
    borderRadius: '9999px',
    fontSize: '10px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default function CustomerNav() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Customer Mobile Navigation
      </h1>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' as const }}>
        {/* Phone with standard nav */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Standard Navigation</h2>
          <div style={styles.phoneFrame}>
            <div style={styles.header}>
              <span style={styles.headerLogo}>furrie</span>
              <div style={styles.headerIcon}>JD</div>
            </div>
            <div style={styles.content}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#303344', marginBottom: '8px' }}>Welcome back, John!</h3>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Your pets are waiting for you.</p>
              </div>
            </div>
            <div style={styles.bottomNav}>
              <div style={{ ...styles.navItem, ...styles.navItemActive }}>
                <span style={{ ...styles.navIcon, ...styles.navIconActive }}>&#127968;</span>
                <span style={{ ...styles.navLabel, ...styles.navLabelActive }}>Home</span>
              </div>
              <div style={styles.navItem}>
                <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128054;</span>
                <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Pets</span>
              </div>
              <div style={styles.connectButton}>
                <div style={styles.connectCircle}>&#128222;</div>
                <span style={{ ...styles.navLabel, color: '#CE3E24', fontWeight: 600 }}>Connect</span>
              </div>
              <div style={{ ...styles.navItem, position: 'relative' as const }}>
                <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128196;</span>
                <span style={styles.navBadge}>2</span>
                <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>History</span>
              </div>
              <div style={styles.navItem}>
                <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128100;</span>
                <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Profile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phone with Pets tab active */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Pets Tab Active</h2>
          <div style={styles.phoneFrame}>
            <div style={styles.header}>
              <span style={styles.headerLogo}>furrie</span>
              <div style={styles.headerIcon}>JD</div>
            </div>
            <div style={styles.content}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#303344', marginBottom: '8px' }}>My Pets</h3>
              </div>
            </div>
            <div style={styles.bottomNav}>
              <div style={styles.navItem}>
                <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#127968;</span>
                <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Home</span>
              </div>
              <div style={{ ...styles.navItem, ...styles.navItemActive }}>
                <span style={{ ...styles.navIcon, ...styles.navIconActive }}>&#128054;</span>
                <span style={{ ...styles.navLabel, ...styles.navLabelActive }}>Pets</span>
              </div>
              <div style={styles.connectButton}>
                <div style={styles.connectCircle}>&#128222;</div>
                <span style={{ ...styles.navLabel, color: '#CE3E24', fontWeight: 600 }}>Connect</span>
              </div>
              <div style={styles.navItem}>
                <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128196;</span>
                <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>History</span>
              </div>
              <div style={styles.navItem}>
                <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128100;</span>
                <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav item states detail */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Navigation Item States</h2>
        <div style={{ display: 'flex', gap: '24px', backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', maxWidth: '600px' }}>
          <div style={{ textAlign: 'center' as const }}>
            <span style={styles.label}>Inactive</span>
            <div style={styles.navItem}>
              <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#127968;</span>
              <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>Home</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <span style={styles.label}>Active</span>
            <div style={{ ...styles.navItem, ...styles.navItemActive }}>
              <span style={{ ...styles.navIcon, ...styles.navIconActive }}>&#127968;</span>
              <span style={{ ...styles.navLabel, ...styles.navLabelActive }}>Home</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <span style={styles.label}>With Badge</span>
            <div style={{ ...styles.navItem, position: 'relative' as const }}>
              <span style={{ ...styles.navIcon, ...styles.navIconInactive }}>&#128196;</span>
              <span style={styles.navBadge}>3</span>
              <span style={{ ...styles.navLabel, ...styles.navLabelInactive }}>History</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <span style={styles.label}>Connect CTA</span>
            <div style={styles.connectButton}>
              <div style={styles.connectCircle}>&#128222;</div>
              <span style={{ ...styles.navLabel, color: '#CE3E24', fontWeight: 600 }}>Connect</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header Variations */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Header Variations</h2>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px', maxWidth: '320px' }}>
          <div style={{ ...styles.header, borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <span style={styles.headerLogo}>furrie</span>
            <div style={styles.headerIcon}>JD</div>
          </div>
          <div style={{ ...styles.header, borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
            }}>&#8592;</button>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#303344' }}>My Pets</span>
            <div style={{ width: '40px' }}></div>
          </div>
          <div style={{ ...styles.header, borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
            }}>&#8592;</button>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#303344' }}>Add New Pet</span>
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#CE3E24',
            }}>&#10003;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
