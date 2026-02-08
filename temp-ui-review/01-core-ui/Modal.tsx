// Modal.tsx - Modal Dialog Component
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
  // Modal backdrop
  backdrop: {
    position: 'relative' as const,
    backgroundColor: 'rgba(48, 51, 68, 0.5)',
    padding: '40px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  // Modal container
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(48, 51, 68, 0.1), 0 8px 10px -6px rgba(48, 51, 68, 0.04)',
    width: '100%',
    maxWidth: '480px',
    overflow: 'hidden',
  },
  modalSm: {
    maxWidth: '360px',
  },
  modalLg: {
    maxWidth: '640px',
  },
  // Modal header
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #E5E7EB',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#303344',
    margin: 0,
  },
  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6B7280',
    fontSize: '20px',
    transition: 'background-color 0.15s ease',
  },
  closeButtonHover: {
    backgroundColor: '#F3F4F6',
  },
  // Modal body
  modalBody: {
    padding: '24px',
  },
  modalBodyText: {
    fontSize: '14px',
    color: '#464A5C',
    lineHeight: 1.6,
    margin: 0,
  },
  // Modal footer
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalFooterStacked: {
    flexDirection: 'column' as const,
    gap: '8px',
  },
  // Buttons
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: '#464A5C',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: '#CE3E24',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonFullWidth: {
    width: '100%',
  },
  // Alert modal icon
  alertIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '24px',
  },
  alertIconWarning: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  alertIconDanger: {
    backgroundColor: '#FEE2E2',
    color: '#CE3E24',
  },
  alertIconSuccess: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  // Mobile sheet style
  mobileSheet: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: '16px 16px 0 0',
    maxHeight: '90%',
    overflow: 'auto',
  },
  sheetHandle: {
    width: '32px',
    height: '4px',
    backgroundColor: '#D1D5DB',
    borderRadius: '2px',
    margin: '12px auto',
  },
};

export default function Modal() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Modal Components
      </h1>

      {/* Standard Modal */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Standard Modal</h2>
        <div style={styles.backdrop}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Pet</h2>
              <button style={styles.closeButton}>x</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalBodyText}>
                Fill in the details below to add a new pet to your profile. You can add photos and medical history later.
              </p>
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#303344', marginBottom: '6px' }}>
                  Pet Name
                </label>
                <input
                  type="text"
                  placeholder="Enter pet name"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '16px',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: '8px',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary}>Cancel</button>
              <button style={styles.buttonPrimary}>Add Pet</button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Confirmation Modal (Danger)</h2>
        <div style={styles.backdrop}>
          <div style={{ ...styles.modal, ...styles.modalSm }}>
            <div style={{ ...styles.modalBody, textAlign: 'center' as const }}>
              <div style={{ ...styles.alertIcon, ...styles.alertIconDanger }}>!</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#303344', margin: '0 0 8px 0' }}>
                Delete Pet Profile?
              </h3>
              <p style={{ ...styles.modalBodyText, textAlign: 'center' as const }}>
                This will permanently delete Max's profile and all associated consultation history. This action cannot be undone.
              </p>
            </div>
            <div style={{ ...styles.modalFooter, ...styles.modalFooterStacked }}>
              <button style={{ ...styles.buttonDanger, ...styles.buttonFullWidth }}>Delete Pet</button>
              <button style={{ ...styles.buttonSecondary, ...styles.buttonFullWidth }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Success Modal</h2>
        <div style={styles.backdrop}>
          <div style={{ ...styles.modal, ...styles.modalSm }}>
            <div style={{ ...styles.modalBody, textAlign: 'center' as const }}>
              <div style={{ ...styles.alertIcon, ...styles.alertIconSuccess }}>&#10003;</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#303344', margin: '0 0 8px 0' }}>
                Payment Successful!
              </h3>
              <p style={{ ...styles.modalBodyText, textAlign: 'center' as const }}>
                Your consultation has been booked. You'll receive a confirmation email shortly.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.buttonPrimary, ...styles.buttonFullWidth }}>Continue</button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Warning Modal</h2>
        <div style={styles.backdrop}>
          <div style={{ ...styles.modal, ...styles.modalSm }}>
            <div style={{ ...styles.modalBody, textAlign: 'center' as const }}>
              <div style={{ ...styles.alertIcon, ...styles.alertIconWarning }}>!</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#303344', margin: '0 0 8px 0' }}>
                End Consultation?
              </h3>
              <p style={{ ...styles.modalBodyText, textAlign: 'center' as const }}>
                Are you sure you want to end this consultation? You can still message the vet for the next 7 days.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary}>Continue Call</button>
              <button style={styles.buttonPrimary}>End Call</button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Mobile Bottom Sheet</h2>
        <div style={{ ...styles.backdrop, position: 'relative' as const, height: '500px', alignItems: 'flex-end' }}>
          <div style={{ ...styles.mobileSheet, position: 'relative' as const, width: '320px' }}>
            <div style={styles.sheetHandle}></div>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Filter Options</h2>
              <button style={styles.closeButton}>x</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#303344', marginBottom: '8px' }}>
                  Status
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
                  <span style={{ padding: '8px 16px', backgroundColor: '#1E5081', color: '#FFFFFF', borderRadius: '9999px', fontSize: '14px', fontWeight: 500 }}>All</span>
                  <span style={{ padding: '8px 16px', backgroundColor: '#F3F4F6', color: '#464A5C', borderRadius: '9999px', fontSize: '14px', fontWeight: 500 }}>Completed</span>
                  <span style={{ padding: '8px 16px', backgroundColor: '#F3F4F6', color: '#464A5C', borderRadius: '9999px', fontSize: '14px', fontWeight: 500 }}>Pending</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#303344', marginBottom: '8px' }}>
                  Date Range
                </label>
                <select style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '16px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                }}>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>All time</option>
                </select>
              </div>
            </div>
            <div style={{ ...styles.modalFooter, ...styles.modalFooterStacked }}>
              <button style={{ ...styles.buttonPrimary, ...styles.buttonFullWidth }}>Apply Filters</button>
              <button style={{ ...styles.buttonSecondary, ...styles.buttonFullWidth }}>Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* Large Modal (Form) */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Large Modal (Multi-step Form)</h2>
        <div style={styles.backdrop}>
          <div style={{ ...styles.modal, ...styles.modalLg }}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Start Consultation</h2>
              <button style={styles.closeButton}>x</button>
            </div>
            <div style={styles.modalBody}>
              {/* Progress indicator */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1E5081', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>1</div>
                  <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 500, color: '#1E5081' }}>Select Pet</span>
                </div>
                <div style={{ flex: 1, height: '2px', backgroundColor: '#E5E7EB', margin: '0 12px' }}></div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E5E7EB', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>2</div>
                  <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>Symptoms</span>
                </div>
                <div style={{ flex: 1, height: '2px', backgroundColor: '#E5E7EB', margin: '0 12px' }}></div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E5E7EB', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>3</div>
                  <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>Confirm</span>
                </div>
              </div>
              {/* Pet selection */}
              <p style={{ ...styles.modalBodyText, marginBottom: '16px' }}>
                Select which pet needs a consultation:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', border: '2px solid #1E5081', borderRadius: '8px', cursor: 'pointer' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F2EAC3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 600, color: '#303344' }}>M</div>
                  <div style={{ marginLeft: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#303344' }}>Max</div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>Golden Retriever, 3 years</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F2EAC3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 600, color: '#303344' }}>B</div>
                  <div style={{ marginLeft: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#303344' }}>Bella</div>
                    <div style={{ fontSize: '14px', color: '#6B7280' }}>Persian Cat, 2 years</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary}>Cancel</button>
              <button style={styles.buttonPrimary}>Next: Symptoms</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
