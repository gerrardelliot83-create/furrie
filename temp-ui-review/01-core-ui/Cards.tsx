// Cards.tsx - All Card Variants
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
  row: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '16px',
    marginBottom: '16px',
  },
  label: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '8px',
    display: 'block',
  },
  // Base card
  cardBase: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
  },
  // Elevated card
  cardElevated: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: 'none',
    boxShadow: '0 4px 6px -1px rgba(48, 51, 68, 0.1), 0 2px 4px -1px rgba(48, 51, 68, 0.06)',
  },
  // Interactive card
  cardInteractive: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cardInteractiveHover: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #1E5081',
    boxShadow: '0 4px 6px -1px rgba(48, 51, 68, 0.1), 0 2px 4px -1px rgba(48, 51, 68, 0.06)',
    cursor: 'pointer',
  },
  // Compact card
  cardCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '12px 16px',
    border: '1px solid #E5E7EB',
  },
  // Full width card (mobile)
  cardFullWidth: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
    width: '100%',
  },
  // Card with header
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #E5E7EB',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#303344',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0 0 0',
  },
  cardBody: {
    fontSize: '14px',
    color: '#464A5C',
    lineHeight: 1.5,
  },
  cardFooter: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #E5E7EB',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  // Status card variants
  cardSuccess: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #059669',
    borderLeft: '4px solid #059669',
  },
  cardWarning: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #D97706',
    borderLeft: '4px solid #D97706',
  },
  cardError: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #CE3E24',
    borderLeft: '4px solid #CE3E24',
  },
  cardInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #7796CC',
    borderLeft: '4px solid #7796CC',
  },
  // Stat card
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
    minWidth: '160px',
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
  },
  statChangePositive: {
    color: '#059669',
  },
  statChangeNegative: {
    color: '#CE3E24',
  },
  // Button styles for card footers
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: '#1E5081',
    border: '1px solid #1E5081',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default function Cards() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Card Components
      </h1>

      {/* Basic Cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Basic Cards</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Default (Bordered)</span>
            <div style={{ ...styles.cardBase, width: '280px' }}>
              <h3 style={styles.cardTitle}>Card Title</h3>
              <p style={styles.cardBody}>
                This is a basic card with a subtle border. Use for standard content containers.
              </p>
            </div>
          </div>
          <div>
            <span style={styles.label}>Elevated (Shadow)</span>
            <div style={{ ...styles.cardElevated, width: '280px' }}>
              <h3 style={styles.cardTitle}>Card Title</h3>
              <p style={styles.cardBody}>
                This card uses shadow instead of border. Use for prominent content.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Interactive Cards</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Default State</span>
            <div style={{ ...styles.cardInteractive, width: '280px' }}>
              <h3 style={styles.cardTitle}>Clickable Card</h3>
              <p style={styles.cardBody}>
                This card is interactive. Click to navigate or trigger an action.
              </p>
            </div>
          </div>
          <div>
            <span style={styles.label}>Hover State</span>
            <div style={{ ...styles.cardInteractiveHover, width: '280px' }}>
              <h3 style={styles.cardTitle}>Hovered Card</h3>
              <p style={styles.cardBody}>
                Notice the border color change and subtle shadow lift on hover.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards with Header/Footer */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Cards with Header & Footer</h2>
        <div style={{ ...styles.cardBase, maxWidth: '400px' }}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>Consultation Details</h3>
              <p style={styles.cardSubtitle}>Scheduled for today</p>
            </div>
            <span style={{
              padding: '4px 12px',
              backgroundColor: '#D1FAE5',
              color: '#059669',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
            }}>Active</span>
          </div>
          <div style={styles.cardBody}>
            <p style={{ margin: '0 0 8px 0' }}>Pet: Max (Golden Retriever)</p>
            <p style={{ margin: '0 0 8px 0' }}>Concern: Loss of appetite</p>
            <p style={{ margin: 0 }}>Duration: 15 minutes</p>
          </div>
          <div style={styles.cardFooter}>
            <button style={styles.buttonSecondary}>View Details</button>
            <button style={styles.buttonPrimary}>Join Call</button>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Status Cards</h2>
        <div style={styles.row}>
          <div style={{ ...styles.cardSuccess, width: '220px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#059669', fontSize: '14px', fontWeight: 600 }}>Success</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#464A5C' }}>
              Payment completed successfully.
            </p>
          </div>
          <div style={{ ...styles.cardWarning, width: '220px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#D97706', fontSize: '14px', fontWeight: 600 }}>Warning</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#464A5C' }}>
              Your subscription expires soon.
            </p>
          </div>
          <div style={{ ...styles.cardError, width: '220px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#CE3E24', fontSize: '14px', fontWeight: 600 }}>Error</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#464A5C' }}>
              Connection failed. Please retry.
            </p>
          </div>
          <div style={{ ...styles.cardInfo, width: '220px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#7796CC', fontSize: '14px', fontWeight: 600 }}>Info</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#464A5C' }}>
              New features available now.
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Stat Cards (Dashboard)</h2>
        <div style={styles.row}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>24</div>
            <div style={styles.statLabel}>Consultations Today</div>
            <div style={{ ...styles.statChange, ...styles.statChangePositive }}>+12% from yesterday</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>8</div>
            <div style={styles.statLabel}>In Queue</div>
            <div style={{ ...styles.statChange, ...styles.statChangeNegative }}>+3 from avg</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#059669' }}>98%</div>
            <div style={styles.statLabel}>Satisfaction Rate</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>12m</div>
            <div style={styles.statLabel}>Avg. Call Duration</div>
          </div>
        </div>
      </div>

      {/* Compact Cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Compact Cards</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
          <div style={{ ...styles.cardCompact, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
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
              }}>M</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#303344' }}>Max</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Golden Retriever</div>
              </div>
            </div>
            <span style={{ color: '#9CA3AF', fontSize: '20px' }}>{'>'}</span>
          </div>
          <div style={{ ...styles.cardCompact, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
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
              }}>B</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#303344' }}>Bella</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Persian Cat</div>
              </div>
            </div>
            <span style={{ color: '#9CA3AF', fontSize: '20px' }}>{'>'}</span>
          </div>
        </div>
      </div>

      {/* Mobile Full Width */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Full Width (Mobile)</h2>
        <div style={{ maxWidth: '320px' }}>
          <div style={styles.cardFullWidth}>
            <h3 style={styles.cardTitle}>Mobile Card</h3>
            <p style={styles.cardBody}>
              This card takes full width on mobile devices. The max-width here simulates a mobile viewport.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
