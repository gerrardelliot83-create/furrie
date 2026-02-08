// Badges.tsx - All Badge/Status Variants
// Copy this file to Claude Desktop and ask: "Please render this as a React artifact"

const styles = {
  container: {
    fontFamily: "'Epilogue', -apple-system, sans-serif",
    padding: '24px',
    backgroundColor: '#FFFFFF',
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
    gap: '12px',
    marginBottom: '16px',
    alignItems: 'center',
  },
  label: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '8px',
    display: 'block',
  },
  // Base badge
  badgeBase: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Epilogue', sans-serif",
    fontWeight: 600,
    borderRadius: '9999px',
    whiteSpace: 'nowrap' as const,
  },
  // Sizes
  sm: {
    padding: '2px 8px',
    fontSize: '11px',
  },
  md: {
    padding: '4px 12px',
    fontSize: '12px',
  },
  lg: {
    padding: '6px 16px',
    fontSize: '14px',
  },
  // Status variants - Filled
  success: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  warning: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  error: {
    backgroundColor: '#FEE2E2',
    color: '#CE3E24',
  },
  info: {
    backgroundColor: '#DBEAFE',
    color: '#1E5081',
  },
  neutral: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  // Status variants - Outline
  successOutline: {
    backgroundColor: 'transparent',
    color: '#059669',
    border: '1px solid #059669',
  },
  warningOutline: {
    backgroundColor: 'transparent',
    color: '#D97706',
    border: '1px solid #D97706',
  },
  errorOutline: {
    backgroundColor: 'transparent',
    color: '#CE3E24',
    border: '1px solid #CE3E24',
  },
  infoOutline: {
    backgroundColor: 'transparent',
    color: '#1E5081',
    border: '1px solid #1E5081',
  },
  neutralOutline: {
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: '1px solid #9CA3AF',
  },
  // Dot indicator
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px',
  },
  dotSuccess: {
    backgroundColor: '#059669',
  },
  dotWarning: {
    backgroundColor: '#D97706',
  },
  dotError: {
    backgroundColor: '#CE3E24',
  },
  dotInfo: {
    backgroundColor: '#7796CC',
  },
  // Counter badge
  counter: {
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    fontSize: '11px',
    fontWeight: 700,
  },
  counterPrimary: {
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
  },
  counterAccent: {
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
  },
  // Tag style (for pet breeds, symptoms, etc.)
  tag: {
    backgroundColor: '#F2EAC3',
    color: '#303344',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
  },
  tagRemovable: {
    backgroundColor: '#F2EAC3',
    color: '#303344',
    padding: '4px 8px 4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  tagRemoveButton: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: 'rgba(48, 51, 68, 0.2)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#303344',
  },
  // Online/Offline status
  statusIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statusOnline: {
    backgroundColor: '#059669',
    boxShadow: '0 0 0 2px rgba(5, 150, 105, 0.2)',
  },
  statusOffline: {
    backgroundColor: '#9CA3AF',
  },
  statusBusy: {
    backgroundColor: '#D97706',
    boxShadow: '0 0 0 2px rgba(217, 119, 6, 0.2)',
  },
};

export default function Badges() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Badge & Status Components
      </h1>

      {/* Status Badges - Filled */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Status Badges (Filled)</h2>
        <div style={styles.row}>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.success }}>Completed</span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.warning }}>Pending</span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.error }}>Cancelled</span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.info }}>In Progress</span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.neutral }}>Draft</span>
        </div>
      </div>

      {/* Status Badges - Outline */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Status Badges (Outline)</h2>
        <div style={styles.row}>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.successOutline }}>Verified</span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.warningOutline }}>Review</span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.errorOutline }}>Rejected</span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.infoOutline }}>Active</span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.neutralOutline }}>Inactive</span>
        </div>
      </div>

      {/* Badge Sizes */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Badge Sizes</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Small</span>
            <span style={{ ...styles.badgeBase, ...styles.sm, ...styles.success }}>Small</span>
          </div>
          <div>
            <span style={styles.label}>Medium (default)</span>
            <span style={{ ...styles.badgeBase, ...styles.md, ...styles.success }}>Medium</span>
          </div>
          <div>
            <span style={styles.label}>Large</span>
            <span style={{ ...styles.badgeBase, ...styles.lg, ...styles.success }}>Large</span>
          </div>
        </div>
      </div>

      {/* Badges with Dots */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Badges with Status Dot</h2>
        <div style={styles.row}>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.success }}>
            <span style={{ ...styles.dot, ...styles.dotSuccess }}></span>
            Online
          </span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.warning }}>
            <span style={{ ...styles.dot, ...styles.dotWarning }}></span>
            Away
          </span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.error }}>
            <span style={{ ...styles.dot, ...styles.dotError }}></span>
            Busy
          </span>
          <span style={{ ...styles.badgeBase, ...styles.md, ...styles.neutral }}>
            <span style={{ ...styles.dot, backgroundColor: '#9CA3AF' }}></span>
            Offline
          </span>
        </div>
      </div>

      {/* Counter Badges */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Counter Badges (Notifications)</h2>
        <div style={styles.row}>
          <span style={{ ...styles.badgeBase, ...styles.counter, ...styles.counterPrimary }}>3</span>
          <span style={{ ...styles.badgeBase, ...styles.counter, ...styles.counterAccent }}>12</span>
          <span style={{ ...styles.badgeBase, ...styles.counter, ...styles.counterPrimary }}>99+</span>
          <span style={{ ...styles.badgeBase, ...styles.counter, backgroundColor: '#059669', color: '#FFFFFF' }}>5</span>
        </div>
        <div style={{ marginTop: '16px' }}>
          <span style={styles.label}>On Navigation Items</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#464A5C' }}>Messages</span>
              <span style={{ ...styles.badgeBase, ...styles.counter, ...styles.counterAccent }}>5</span>
            </div>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', color: '#464A5C' }}>Notifications</span>
              <span style={{ ...styles.badgeBase, ...styles.counter, ...styles.counterPrimary }}>23</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Tags (Non-interactive)</h2>
        <div style={styles.row}>
          <span style={styles.tag}>Golden Retriever</span>
          <span style={styles.tag}>3 years old</span>
          <span style={styles.tag}>Male</span>
          <span style={styles.tag}>Vaccinated</span>
        </div>
      </div>

      {/* Removable Tags */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Removable Tags (Symptom Selection)</h2>
        <div style={styles.row}>
          <span style={styles.tagRemovable}>
            Loss of appetite
            <button style={styles.tagRemoveButton}>x</button>
          </span>
          <span style={styles.tagRemovable}>
            Lethargy
            <button style={styles.tagRemoveButton}>x</button>
          </span>
          <span style={styles.tagRemovable}>
            Vomiting
            <button style={styles.tagRemoveButton}>x</button>
          </span>
        </div>
      </div>

      {/* Online Status Indicators */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Vet Status Indicators</h2>
        <div style={styles.row}>
          <div style={styles.statusIndicator}>
            <span style={{ ...styles.statusDot, ...styles.statusOnline }}></span>
            <span style={{ color: '#059669' }}>Available</span>
          </div>
          <div style={styles.statusIndicator}>
            <span style={{ ...styles.statusDot, ...styles.statusBusy }}></span>
            <span style={{ color: '#D97706' }}>In Consultation</span>
          </div>
          <div style={styles.statusIndicator}>
            <span style={{ ...styles.statusDot, ...styles.statusOffline }}></span>
            <span style={{ color: '#6B7280' }}>Offline</span>
          </div>
        </div>
      </div>

      {/* Consultation Status Examples */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Consultation Status Examples</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#F9F6E8',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '14px', color: '#303344' }}>Consultation #1234</span>
            <span style={{ ...styles.badgeBase, ...styles.sm, ...styles.info }}>Scheduled</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#F9F6E8',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '14px', color: '#303344' }}>Consultation #1235</span>
            <span style={{ ...styles.badgeBase, ...styles.sm, ...styles.success }}>Completed</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#F9F6E8',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '14px', color: '#303344' }}>Consultation #1236</span>
            <span style={{ ...styles.badgeBase, ...styles.sm, ...styles.warning }}>Awaiting Payment</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#F9F6E8',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '14px', color: '#303344' }}>Consultation #1237</span>
            <span style={{ ...styles.badgeBase, ...styles.sm, ...styles.error }}>Cancelled</span>
          </div>
        </div>
      </div>

      {/* Pet Type Badges */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Pet Type Indicators</h2>
        <div style={styles.row}>
          <span style={{
            ...styles.badgeBase,
            ...styles.md,
            backgroundColor: '#FEF3C7',
            color: '#92400E'
          }}>Dog</span>
          <span style={{
            ...styles.badgeBase,
            ...styles.md,
            backgroundColor: '#E0E7FF',
            color: '#4338CA'
          }}>Cat</span>
        </div>
      </div>
    </div>
  );
}
