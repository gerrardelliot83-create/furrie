// Misc.tsx - Avatar, Skeleton, Toast Components
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
    gap: '16px',
    marginBottom: '16px',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '8px',
    display: 'block',
  },
  // Avatar base
  avatarBase: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    fontFamily: "'Epilogue', sans-serif",
    fontWeight: 600,
    color: '#303344',
    backgroundColor: '#F2EAC3',
    flexShrink: 0,
  },
  // Avatar sizes
  avatarXs: {
    width: '24px',
    height: '24px',
    fontSize: '10px',
  },
  avatarSm: {
    width: '32px',
    height: '32px',
    fontSize: '12px',
  },
  avatarMd: {
    width: '40px',
    height: '40px',
    fontSize: '14px',
  },
  avatarLg: {
    width: '56px',
    height: '56px',
    fontSize: '20px',
  },
  avatarXl: {
    width: '80px',
    height: '80px',
    fontSize: '28px',
  },
  // Avatar with image
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    borderRadius: '50%',
  },
  // Avatar with status
  avatarWrapper: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  avatarStatus: {
    position: 'absolute' as const,
    bottom: '0',
    right: '0',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid #FFFFFF',
  },
  statusOnline: {
    backgroundColor: '#059669',
  },
  statusOffline: {
    backgroundColor: '#9CA3AF',
  },
  statusBusy: {
    backgroundColor: '#D97706',
  },
  // Skeleton base
  skeletonBase: {
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  // Skeleton variants
  skeletonText: {
    height: '14px',
    width: '100%',
  },
  skeletonTitle: {
    height: '20px',
    width: '60%',
  },
  skeletonAvatar: {
    borderRadius: '50%',
  },
  skeletonButton: {
    height: '40px',
    width: '120px',
    borderRadius: '8px',
  },
  skeletonCard: {
    height: '120px',
    width: '100%',
    borderRadius: '12px',
  },
  // Toast base
  toastBase: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(48, 51, 68, 0.15)',
    maxWidth: '360px',
    minWidth: '280px',
  },
  // Toast variants
  toastSuccess: {
    backgroundColor: '#FFFFFF',
    borderLeft: '4px solid #059669',
  },
  toastError: {
    backgroundColor: '#FFFFFF',
    borderLeft: '4px solid #CE3E24',
  },
  toastWarning: {
    backgroundColor: '#FFFFFF',
    borderLeft: '4px solid #D97706',
  },
  toastInfo: {
    backgroundColor: '#FFFFFF',
    borderLeft: '4px solid #7796CC',
  },
  toastIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: '2px',
  },
  toastIconSuccess: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  toastIconError: {
    backgroundColor: '#FEE2E2',
    color: '#CE3E24',
  },
  toastIconWarning: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  toastIconInfo: {
    backgroundColor: '#DBEAFE',
    color: '#1E5081',
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#303344',
    margin: '0 0 2px 0',
  },
  toastMessage: {
    fontSize: '13px',
    color: '#6B7280',
    margin: 0,
    lineHeight: 1.4,
  },
  toastClose: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#9CA3AF',
    fontSize: '16px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  // Loading spinner
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #E5E7EB',
    borderTopColor: '#1E5081',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerSm: {
    width: '16px',
    height: '16px',
    border: '2px solid #E5E7EB',
    borderTopColor: '#1E5081',
  },
  spinnerLg: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E7EB',
    borderTopColor: '#1E5081',
  },
  // Progress bar
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#E5E7EB',
    borderRadius: '9999px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E5081',
    borderRadius: '9999px',
    transition: 'width 0.3s ease',
  },
  // Divider
  divider: {
    height: '1px',
    backgroundColor: '#E5E7EB',
    margin: '16px 0',
  },
  dividerWithText: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    margin: '16px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: '12px',
    color: '#9CA3AF',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
  },
};

export default function Misc() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Miscellaneous Components
      </h1>

      {/* Avatars */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Avatars - Sizes</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>XS (24px)</span>
            <div style={{ ...styles.avatarBase, ...styles.avatarXs }}>M</div>
          </div>
          <div>
            <span style={styles.label}>SM (32px)</span>
            <div style={{ ...styles.avatarBase, ...styles.avatarSm }}>M</div>
          </div>
          <div>
            <span style={styles.label}>MD (40px)</span>
            <div style={{ ...styles.avatarBase, ...styles.avatarMd }}>M</div>
          </div>
          <div>
            <span style={styles.label}>LG (56px)</span>
            <div style={{ ...styles.avatarBase, ...styles.avatarLg }}>M</div>
          </div>
          <div>
            <span style={styles.label}>XL (80px)</span>
            <div style={{ ...styles.avatarBase, ...styles.avatarXl }}>M</div>
          </div>
        </div>
      </div>

      {/* Avatars with Status */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Avatars with Status</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Online</span>
            <div style={styles.avatarWrapper}>
              <div style={{ ...styles.avatarBase, ...styles.avatarLg }}>DR</div>
              <span style={{ ...styles.avatarStatus, ...styles.statusOnline }}></span>
            </div>
          </div>
          <div>
            <span style={styles.label}>Busy</span>
            <div style={styles.avatarWrapper}>
              <div style={{ ...styles.avatarBase, ...styles.avatarLg }}>AK</div>
              <span style={{ ...styles.avatarStatus, ...styles.statusBusy }}></span>
            </div>
          </div>
          <div>
            <span style={styles.label}>Offline</span>
            <div style={styles.avatarWrapper}>
              <div style={{ ...styles.avatarBase, ...styles.avatarLg }}>SP</div>
              <span style={{ ...styles.avatarStatus, ...styles.statusOffline }}></span>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Group */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Avatar Group (Stacked)</h2>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ ...styles.avatarBase, ...styles.avatarMd, border: '2px solid #FFFFFF', marginRight: '-12px', zIndex: 3 }}>A</div>
          <div style={{ ...styles.avatarBase, ...styles.avatarMd, border: '2px solid #FFFFFF', marginRight: '-12px', zIndex: 2 }}>B</div>
          <div style={{ ...styles.avatarBase, ...styles.avatarMd, border: '2px solid #FFFFFF', marginRight: '-12px', zIndex: 1 }}>C</div>
          <div style={{ ...styles.avatarBase, ...styles.avatarMd, border: '2px solid #FFFFFF', backgroundColor: '#1E5081', color: '#FFFFFF' }}>+3</div>
        </div>
      </div>

      {/* Skeleton Loading */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Skeleton Loading States</h2>
        <div style={{ maxWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ ...styles.skeletonBase, ...styles.skeletonAvatar, width: '48px', height: '48px' }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ ...styles.skeletonBase, ...styles.skeletonTitle, marginBottom: '8px' }}></div>
              <div style={{ ...styles.skeletonBase, ...styles.skeletonText, width: '80%' }}></div>
            </div>
          </div>
          <div style={{ ...styles.skeletonBase, ...styles.skeletonText, marginBottom: '8px' }}></div>
          <div style={{ ...styles.skeletonBase, ...styles.skeletonText, marginBottom: '8px', width: '90%' }}></div>
          <div style={{ ...styles.skeletonBase, ...styles.skeletonText, width: '70%', marginBottom: '16px' }}></div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ ...styles.skeletonBase, ...styles.skeletonButton }}></div>
            <div style={{ ...styles.skeletonBase, ...styles.skeletonButton, width: '80px' }}></div>
          </div>
        </div>
      </div>

      {/* Skeleton Card */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Skeleton Card</h2>
        <div style={{ maxWidth: '320px', padding: '16px', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px' }}>
          <div style={{ ...styles.skeletonBase, ...styles.skeletonCard, marginBottom: '12px' }}></div>
          <div style={{ ...styles.skeletonBase, ...styles.skeletonTitle, marginBottom: '8px' }}></div>
          <div style={{ ...styles.skeletonBase, ...styles.skeletonText, width: '80%' }}></div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Toast Notifications</h2>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
          <div style={{ ...styles.toastBase, ...styles.toastSuccess }}>
            <span style={{ ...styles.toastIcon, ...styles.toastIconSuccess }}>&#10003;</span>
            <div style={styles.toastContent}>
              <h4 style={styles.toastTitle}>Success</h4>
              <p style={styles.toastMessage}>Your pet profile has been saved successfully.</p>
            </div>
            <button style={styles.toastClose}>x</button>
          </div>

          <div style={{ ...styles.toastBase, ...styles.toastError }}>
            <span style={{ ...styles.toastIcon, ...styles.toastIconError }}>!</span>
            <div style={styles.toastContent}>
              <h4 style={styles.toastTitle}>Error</h4>
              <p style={styles.toastMessage}>Failed to connect to the video call. Please try again.</p>
            </div>
            <button style={styles.toastClose}>x</button>
          </div>

          <div style={{ ...styles.toastBase, ...styles.toastWarning }}>
            <span style={{ ...styles.toastIcon, ...styles.toastIconWarning }}>!</span>
            <div style={styles.toastContent}>
              <h4 style={styles.toastTitle}>Warning</h4>
              <p style={styles.toastMessage}>Your session will expire in 5 minutes.</p>
            </div>
            <button style={styles.toastClose}>x</button>
          </div>

          <div style={{ ...styles.toastBase, ...styles.toastInfo }}>
            <span style={{ ...styles.toastIcon, ...styles.toastIconInfo }}>i</span>
            <div style={styles.toastContent}>
              <h4 style={styles.toastTitle}>Info</h4>
              <p style={styles.toastMessage}>A new version of the app is available.</p>
            </div>
            <button style={styles.toastClose}>x</button>
          </div>
        </div>
      </div>

      {/* Loading Spinners */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Loading Spinners</h2>
        <div style={styles.row}>
          <div>
            <span style={styles.label}>Small</span>
            <div style={{ ...styles.spinner, ...styles.spinnerSm }}></div>
          </div>
          <div>
            <span style={styles.label}>Default</span>
            <div style={styles.spinner}></div>
          </div>
          <div>
            <span style={styles.label}>Large</span>
            <div style={{ ...styles.spinner, ...styles.spinnerLg }}></div>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Progress Bars</h2>
        <div style={{ maxWidth: '320px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Profile completion</span>
              <span style={{ fontSize: '12px', color: '#303344', fontWeight: 600 }}>75%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: '75%' }}></div>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Upload progress</span>
              <span style={{ fontSize: '12px', color: '#303344', fontWeight: 600 }}>40%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: '40%', backgroundColor: '#7796CC' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Storage used</span>
              <span style={{ fontSize: '12px', color: '#CE3E24', fontWeight: 600 }}>90%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: '90%', backgroundColor: '#CE3E24' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Dividers */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Dividers</h2>
        <div style={{ maxWidth: '400px' }}>
          <p style={{ fontSize: '14px', color: '#464A5C', marginBottom: 0 }}>Content above divider</p>
          <div style={styles.divider}></div>
          <p style={{ fontSize: '14px', color: '#464A5C', marginTop: 0 }}>Content below divider</p>

          <div style={styles.dividerWithText}>
            <div style={styles.dividerLine}></div>
            <span style={styles.dividerText}>or continue with</span>
            <div style={styles.dividerLine}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#FFFFFF',
              color: '#464A5C',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
            }}>Google</button>
            <button style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#FFFFFF',
              color: '#464A5C',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
            }}>Apple</button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Empty State</h2>
        <div style={{
          maxWidth: '320px',
          padding: '40px 24px',
          backgroundColor: '#F9F6E8',
          borderRadius: '12px',
          textAlign: 'center' as const,
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#F2EAC3',
            borderRadius: '50%',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            color: '#6B7280',
          }}>&#128054;</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#303344', margin: '0 0 8px 0' }}>
            No pets yet
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 16px 0' }}>
            Add your first pet to start a consultation.
          </p>
          <button style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: '#1E5081',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}>Add Pet</button>
        </div>
      </div>

      {/* CSS for animations (add this in a style tag when using) */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
