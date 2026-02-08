// Dashboard.tsx - Customer Dashboard
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
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    border: '8px solid #303344',
    overflow: 'hidden',
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
  headerAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#303344',
  },
  // Content
  content: {
    padding: '16px',
    backgroundColor: '#F9F6E8',
  },
  // Greeting section
  greetingSection: {
    marginBottom: '20px',
  },
  greeting: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 4px 0',
  },
  userName: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#303344',
    margin: 0,
  },
  // CTA Card
  ctaCard: {
    backgroundColor: '#1E5081',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
    color: '#FFFFFF',
  },
  ctaTitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  ctaText: {
    fontSize: '14px',
    opacity: 0.9,
    margin: '0 0 16px 0',
    lineHeight: 1.4,
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Section header
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  sectionLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
    margin: 0,
  },
  seeAllLink: {
    fontSize: '14px',
    color: '#7796CC',
    fontWeight: 500,
    textDecoration: 'none',
  },
  // Pet carousel
  petCarousel: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto' as const,
    paddingBottom: '8px',
    marginBottom: '20px',
  },
  petCard: {
    flexShrink: 0,
    width: '140px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    border: '1px solid #E5E7EB',
  },
  petAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600,
    color: '#303344',
    margin: '0 auto 8px',
  },
  petName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#303344',
    margin: '0 0 2px 0',
  },
  petBreed: {
    fontSize: '12px',
    color: '#6B7280',
    margin: 0,
  },
  addPetCard: {
    flexShrink: 0,
    width: '140px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    border: '2px dashed #E5E7EB',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  addIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#1E5081',
    marginBottom: '8px',
  },
  addText: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1E5081',
    margin: 0,
  },
  // Recent consultation card
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #E5E7EB',
    marginBottom: '12px',
  },
  recentHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  recentInfo: {
    flex: 1,
  },
  recentPetName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#303344',
    margin: '0 0 4px 0',
  },
  recentDate: {
    fontSize: '12px',
    color: '#6B7280',
    margin: 0,
  },
  statusBadge: {
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
  recentSummary: {
    fontSize: '14px',
    color: '#464A5C',
    margin: 0,
    lineHeight: 1.4,
  },
  // Quick actions
  quickActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  },
  quickAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
    border: '1px solid #E5E7EB',
    cursor: 'pointer',
  },
  quickActionIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#F2EAC3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    margin: '0 auto 8px',
  },
  quickActionLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#303344',
    margin: 0,
  },
  // Bottom nav
  bottomNav: {
    height: '72px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 8px 8px',
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
  },
  navItemActive: {
    color: '#1E5081',
  },
  navItemInactive: {
    color: '#9CA3AF',
  },
};

export default function Dashboard() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Customer Dashboard
      </h1>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' as const }}>
        {/* Dashboard with pets */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Dashboard (With Pets)</h2>
          <div style={styles.phoneFrame}>
            <div style={styles.header}>
              <span style={styles.headerLogo}>furrie</span>
              <div style={styles.headerAvatar}>JD</div>
            </div>
            <div style={styles.content}>
              {/* Greeting */}
              <div style={styles.greetingSection}>
                <p style={styles.greeting}>Good morning,</p>
                <h1 style={styles.userName}>John!</h1>
              </div>

              {/* CTA Card */}
              <div style={styles.ctaCard}>
                <h2 style={styles.ctaTitle}>Need a vet?</h2>
                <p style={styles.ctaText}>Connect with a licensed veterinarian in minutes.</p>
                <button style={styles.ctaButton}>
                  <span>&#128222;</span>
                  Connect Now
                </button>
              </div>

              {/* My Pets */}
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionLabel}>My Pets</h3>
                <a href="#" style={styles.seeAllLink}>See all</a>
              </div>
              <div style={styles.petCarousel}>
                <div style={styles.petCard}>
                  <div style={styles.petAvatar}>M</div>
                  <h4 style={styles.petName}>Max</h4>
                  <p style={styles.petBreed}>Golden Retriever</p>
                </div>
                <div style={styles.petCard}>
                  <div style={styles.petAvatar}>B</div>
                  <h4 style={styles.petName}>Bella</h4>
                  <p style={styles.petBreed}>Persian Cat</p>
                </div>
                <div style={styles.addPetCard}>
                  <div style={styles.addIcon}>+</div>
                  <p style={styles.addText}>Add Pet</p>
                </div>
              </div>

              {/* Recent Consultations */}
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionLabel}>Recent Activity</h3>
                <a href="#" style={styles.seeAllLink}>View all</a>
              </div>
              <div style={styles.recentCard}>
                <div style={styles.recentHeader}>
                  <div style={styles.recentInfo}>
                    <h4 style={styles.recentPetName}>Max</h4>
                    <p style={styles.recentDate}>Jan 15, 2026 at 2:30 PM</p>
                  </div>
                  <span style={{ ...styles.statusBadge, ...styles.statusCompleted }}>Completed</span>
                </div>
                <p style={styles.recentSummary}>General checkup - All vitals normal. Recommended monthly deworming.</p>
              </div>
            </div>
            <div style={styles.bottomNav}>
              <div style={{ ...styles.navItem, ...styles.navItemActive }}>
                <span style={{ fontSize: '20px' }}>&#127968;</span>
                <span style={{ fontSize: '11px', fontWeight: 500 }}>Home</span>
              </div>
              <div style={{ ...styles.navItem, ...styles.navItemInactive }}>
                <span style={{ fontSize: '20px' }}>&#128054;</span>
                <span style={{ fontSize: '11px', fontWeight: 500 }}>Pets</span>
              </div>
              <div style={styles.navItem}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#CE3E24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '20px',
                  marginTop: '-16px',
                }}>&#128222;</div>
              </div>
              <div style={{ ...styles.navItem, ...styles.navItemInactive }}>
                <span style={{ fontSize: '20px' }}>&#128196;</span>
                <span style={{ fontSize: '11px', fontWeight: 500 }}>History</span>
              </div>
              <div style={{ ...styles.navItem, ...styles.navItemInactive }}>
                <span style={{ fontSize: '20px' }}>&#128100;</span>
                <span style={{ fontSize: '11px', fontWeight: 500 }}>Profile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard - New User (No Pets) */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Dashboard (New User)</h2>
          <div style={styles.phoneFrame}>
            <div style={styles.header}>
              <span style={styles.headerLogo}>furrie</span>
              <div style={styles.headerAvatar}>JD</div>
            </div>
            <div style={styles.content}>
              {/* Greeting */}
              <div style={styles.greetingSection}>
                <p style={styles.greeting}>Welcome to Furrie,</p>
                <h1 style={styles.userName}>John!</h1>
              </div>

              {/* Onboarding Card */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center' as const,
                border: '1px solid #E5E7EB',
                marginBottom: '20px',
              }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: '#F2EAC3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  margin: '0 auto 16px',
                }}>&#128054;</div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#303344', margin: '0 0 8px 0' }}>
                  Add your first pet
                </h3>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                  Register your pet to start booking consultations with our licensed vets.
                </p>
                <button style={{
                  width: '100%',
                  padding: '14px 20px',
                  fontSize: '16px',
                  fontWeight: 600,
                  backgroundColor: '#1E5081',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}>Add Pet</button>
              </div>

              {/* Quick Actions */}
              <h3 style={{ ...styles.sectionLabel, marginBottom: '12px' }}>How it works</h3>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#1E5081',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}>1</div>
                  <span style={{ fontSize: '14px', color: '#303344' }}>Add your pet's details</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E7EB',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}>2</div>
                  <span style={{ fontSize: '14px', color: '#303344' }}>Describe your concern</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E7EB',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}>3</div>
                  <span style={{ fontSize: '14px', color: '#303344' }}>Connect with a vet</span>
                </div>
              </div>
            </div>
            <div style={styles.bottomNav}>
              <div style={{ ...styles.navItem, ...styles.navItemActive }}>
                <span style={{ fontSize: '20px' }}>&#127968;</span>
                <span style={{ fontSize: '11px', fontWeight: 500 }}>Home</span>
              </div>
              <div style={{ ...styles.navItem, ...styles.navItemInactive }}>
                <span style={{ fontSize: '20px' }}>&#128054;</span>
                <span style={{ fontSize: '11px', fontWeight: 500 }}>Pets</span>
              </div>
              <div style={styles.navItem}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#CE3E24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '20px',
                  marginTop: '-16px',
                  opacity: 0.5,
                }}>&#128222;</div>
              </div>
              <div style={{ ...styles.navItem, ...styles.navItemInactive }}>
                <span style={{ fontSize: '20px' }}>&#128196;</span>
                <span style={{ fontSize: '11px', fontWeight: 500 }}>History</span>
              </div>
              <div style={{ ...styles.navItem, ...styles.navItemInactive }}>
                <span style={{ fontSize: '20px' }}>&#128100;</span>
                <span style={{ fontSize: '11px', fontWeight: 500 }}>Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
