// Buttons.tsx - All Button Variants
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
  },
  label: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '8px',
    display: 'block',
  },
  // Base button
  buttonBase: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: "'Epilogue', sans-serif",
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: '12px',
    cursor: 'pointer',
    border: '1.5px solid transparent',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  },
  // Sizes
  sm: {
    minHeight: '36px',
    padding: '8px 12px',
    fontSize: '14px',
  },
  md: {
    minHeight: '48px',
    padding: '12px 20px',
    fontSize: '16px',
  },
  lg: {
    minHeight: '56px',
    padding: '16px 24px',
    fontSize: '18px',
  },
  // Primary variant
  primary: {
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    borderColor: '#1E5081',
    boxShadow: '0 1px 2px rgba(48, 51, 68, 0.04)',
  },
  primaryHover: {
    backgroundColor: '#153B61',
    borderColor: '#153B61',
    boxShadow: '0 4px 6px -1px rgba(48, 51, 68, 0.1)',
  },
  // Secondary variant
  secondary: {
    backgroundColor: 'transparent',
    color: '#1E5081',
    borderColor: '#1E5081',
  },
  secondaryHover: {
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    boxShadow: '0 1px 2px rgba(48, 51, 68, 0.04)',
  },
  // Ghost variant
  ghost: {
    backgroundColor: 'transparent',
    color: '#464A5C',
    borderColor: 'transparent',
  },
  ghostHover: {
    backgroundColor: '#F2EAC3',
    color: '#303344',
  },
  // Accent variant (CTA)
  accent: {
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
    borderColor: '#CE3E24',
    boxShadow: '0 1px 2px rgba(48, 51, 68, 0.04)',
  },
  accentHover: {
    backgroundColor: '#A93119',
    borderColor: '#A93119',
    boxShadow: '0 4px 6px -1px rgba(48, 51, 68, 0.1)',
  },
  // Danger variant
  danger: {
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
    borderColor: '#CE3E24',
  },
  // Disabled state
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  // Full width
  fullWidth: {
    width: '100%',
  },
};

export default function Buttons() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Button Components
      </h1>

      {/* Primary Buttons */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Primary Buttons</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Small</span>
            <button style={{ ...styles.buttonBase, ...styles.sm, ...styles.primary }}>
              Primary SM
            </button>
          </div>
          <div>
            <span style={styles.label}>Medium (default)</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.primary }}>
              Primary MD
            </button>
          </div>
          <div>
            <span style={styles.label}>Large</span>
            <button style={{ ...styles.buttonBase, ...styles.lg, ...styles.primary }}>
              Primary LG
            </button>
          </div>
        </div>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Hover State</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.primaryHover }}>
              Hovered
            </button>
          </div>
          <div>
            <span style={styles.label}>Disabled</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.primary, ...styles.disabled }}>
              Disabled
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Buttons */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Secondary Buttons (Outline)</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Default</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.secondary }}>
              Secondary
            </button>
          </div>
          <div>
            <span style={styles.label}>Hover State</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.secondaryHover }}>
              Hovered
            </button>
          </div>
          <div>
            <span style={styles.label}>Disabled</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.secondary, ...styles.disabled }}>
              Disabled
            </button>
          </div>
        </div>
      </div>

      {/* Ghost Buttons */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Ghost Buttons</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Default</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.ghost }}>
              Ghost
            </button>
          </div>
          <div>
            <span style={styles.label}>Hover State</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.ghostHover }}>
              Hovered
            </button>
          </div>
        </div>
      </div>

      {/* Accent Buttons (CTAs) */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Accent Buttons (Call to Action)</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Default</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.accent }}>
              Connect Now
            </button>
          </div>
          <div>
            <span style={styles.label}>Hover State</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.accentHover }}>
              Hovered
            </button>
          </div>
          <div>
            <span style={styles.label}>Large CTA</span>
            <button style={{ ...styles.buttonBase, ...styles.lg, ...styles.accent }}>
              Start Consultation
            </button>
          </div>
        </div>
      </div>

      {/* Danger Buttons */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Danger Buttons</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Default</span>
            <button style={{ ...styles.buttonBase, ...styles.md, ...styles.danger }}>
              Delete
            </button>
          </div>
          <div>
            <span style={styles.label}>Small</span>
            <button style={{ ...styles.buttonBase, ...styles.sm, ...styles.danger }}>
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Full Width */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Full Width (Mobile)</h2>
        <div style={{ maxWidth: '320px' }}>
          <button style={{ ...styles.buttonBase, ...styles.md, ...styles.primary, ...styles.fullWidth }}>
            Full Width Primary
          </button>
          <div style={{ height: '12px' }} />
          <button style={{ ...styles.buttonBase, ...styles.md, ...styles.secondary, ...styles.fullWidth }}>
            Full Width Secondary
          </button>
        </div>
      </div>

      {/* With Icons */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>With Icons</h2>
        <div style={styles.row}>
          <button style={{ ...styles.buttonBase, ...styles.md, ...styles.primary }}>
            <span>+</span> Add Pet
          </button>
          <button style={{ ...styles.buttonBase, ...styles.md, ...styles.accent }}>
            <span style={{ fontSize: '20px' }}>&#9742;</span> Call Now
          </button>
          <button style={{ ...styles.buttonBase, ...styles.md, ...styles.secondary }}>
            Edit <span>&#9998;</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Loading State</h2>
        <div style={styles.row}>
          <button style={{ ...styles.buttonBase, ...styles.md, ...styles.primary, position: 'relative' as const }}>
            <span style={{ visibility: 'hidden' as const }}>Loading...</span>
            <span style={{
              position: 'absolute' as const,
              width: '20px',
              height: '20px',
              border: '2px solid #FFFFFF',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }} />
          </button>
          <button style={{ ...styles.buttonBase, ...styles.md, ...styles.accent, position: 'relative' as const }}>
            <span style={{ visibility: 'hidden' as const }}>Connecting...</span>
            <span style={{
              position: 'absolute' as const,
              width: '20px',
              height: '20px',
              border: '2px solid #FFFFFF',
              borderTopColor: 'transparent',
              borderRadius: '50%',
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}
