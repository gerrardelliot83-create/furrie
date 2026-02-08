// StepIndicator.tsx - Step Progress Indicator for Consultation Flow
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
  // Horizontal step indicator
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    maxWidth: '480px',
  },
  // Step item
  stepItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    transition: 'all 0.2s ease',
  },
  stepCircleCompleted: {
    backgroundColor: '#059669',
    color: '#FFFFFF',
  },
  stepCircleCurrent: {
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    boxShadow: '0 0 0 4px rgba(30, 80, 129, 0.15)',
  },
  stepCirclePending: {
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
  },
  stepLabel: {
    fontSize: '12px',
    fontWeight: 500,
    textAlign: 'center' as const,
    maxWidth: '80px',
  },
  stepLabelCompleted: {
    color: '#059669',
  },
  stepLabelCurrent: {
    color: '#1E5081',
    fontWeight: 600,
  },
  stepLabelPending: {
    color: '#9CA3AF',
  },
  // Connector line
  connector: {
    flex: 1,
    height: '2px',
    marginBottom: '28px',
    transition: 'background-color 0.2s ease',
  },
  connectorCompleted: {
    backgroundColor: '#059669',
  },
  connectorPending: {
    backgroundColor: '#E5E7EB',
  },
  // Vertical step indicator
  verticalIndicator: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },
  verticalStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  verticalStepContent: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  verticalConnector: {
    width: '2px',
    height: '32px',
    backgroundColor: '#E5E7EB',
    marginTop: '4px',
  },
  verticalConnectorCompleted: {
    backgroundColor: '#059669',
  },
  verticalInfo: {
    paddingBottom: '24px',
  },
  verticalLabel: {
    fontSize: '14px',
    fontWeight: 500,
    margin: '0 0 4px 0',
  },
  verticalDescription: {
    fontSize: '13px',
    color: '#6B7280',
    margin: 0,
    lineHeight: 1.4,
  },
  // Mobile compact version
  compactIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#F9F6E8',
    borderRadius: '8px',
  },
  compactDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  compactDotCompleted: {
    backgroundColor: '#059669',
  },
  compactDotCurrent: {
    backgroundColor: '#1E5081',
    width: '24px',
    borderRadius: '4px',
  },
  compactDotPending: {
    backgroundColor: '#D1D5DB',
  },
  compactText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#303344',
    marginLeft: '8px',
  },
  // Progress bar style
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#E5E7EB',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1E5081',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#6B7280',
  },
  progressLabelActive: {
    color: '#1E5081',
    fontWeight: 600,
  },
};

export default function StepIndicator() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Step Indicator Components
      </h1>

      {/* Horizontal 3-Step */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Horizontal Steps (3 Steps)</h2>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '32px' }}>
          {/* Step 1 Active */}
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '12px' }}>Step 1 of 3</span>
            <div style={styles.stepIndicator}>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, ...styles.stepCircleCurrent }}>1</div>
                <span style={{ ...styles.stepLabel, ...styles.stepLabelCurrent }}>Select Pet</span>
              </div>
              <div style={{ ...styles.connector, ...styles.connectorPending }}></div>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, ...styles.stepCirclePending }}>2</div>
                <span style={{ ...styles.stepLabel, ...styles.stepLabelPending }}>Symptoms</span>
              </div>
              <div style={{ ...styles.connector, ...styles.connectorPending }}></div>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, ...styles.stepCirclePending }}>3</div>
                <span style={{ ...styles.stepLabel, ...styles.stepLabelPending }}>Confirm</span>
              </div>
            </div>
          </div>

          {/* Step 2 Active */}
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '12px' }}>Step 2 of 3</span>
            <div style={styles.stepIndicator}>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, ...styles.stepCircleCompleted }}>&#10003;</div>
                <span style={{ ...styles.stepLabel, ...styles.stepLabelCompleted }}>Select Pet</span>
              </div>
              <div style={{ ...styles.connector, ...styles.connectorCompleted }}></div>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, ...styles.stepCircleCurrent }}>2</div>
                <span style={{ ...styles.stepLabel, ...styles.stepLabelCurrent }}>Symptoms</span>
              </div>
              <div style={{ ...styles.connector, ...styles.connectorPending }}></div>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, ...styles.stepCirclePending }}>3</div>
                <span style={{ ...styles.stepLabel, ...styles.stepLabelPending }}>Confirm</span>
              </div>
            </div>
          </div>

          {/* Step 3 Active */}
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '12px' }}>Step 3 of 3</span>
            <div style={styles.stepIndicator}>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, ...styles.stepCircleCompleted }}>&#10003;</div>
                <span style={{ ...styles.stepLabel, ...styles.stepLabelCompleted }}>Select Pet</span>
              </div>
              <div style={{ ...styles.connector, ...styles.connectorCompleted }}></div>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, ...styles.stepCircleCompleted }}>&#10003;</div>
                <span style={{ ...styles.stepLabel, ...styles.stepLabelCompleted }}>Symptoms</span>
              </div>
              <div style={{ ...styles.connector, ...styles.connectorCompleted }}></div>
              <div style={styles.stepItem}>
                <div style={{ ...styles.stepCircle, ...styles.stepCircleCurrent }}>3</div>
                <span style={{ ...styles.stepLabel, ...styles.stepLabelCurrent }}>Confirm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal 4-Step */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Horizontal Steps (4 Steps)</h2>
        <div style={{ ...styles.stepIndicator, maxWidth: '600px' }}>
          <div style={styles.stepItem}>
            <div style={{ ...styles.stepCircle, ...styles.stepCircleCompleted }}>&#10003;</div>
            <span style={{ ...styles.stepLabel, ...styles.stepLabelCompleted }}>Pet</span>
          </div>
          <div style={{ ...styles.connector, ...styles.connectorCompleted }}></div>
          <div style={styles.stepItem}>
            <div style={{ ...styles.stepCircle, ...styles.stepCircleCompleted }}>&#10003;</div>
            <span style={{ ...styles.stepLabel, ...styles.stepLabelCompleted }}>Symptoms</span>
          </div>
          <div style={{ ...styles.connector, ...styles.connectorCompleted }}></div>
          <div style={styles.stepItem}>
            <div style={{ ...styles.stepCircle, ...styles.stepCircleCurrent }}>3</div>
            <span style={{ ...styles.stepLabel, ...styles.stepLabelCurrent }}>Payment</span>
          </div>
          <div style={{ ...styles.connector, ...styles.connectorPending }}></div>
          <div style={styles.stepItem}>
            <div style={{ ...styles.stepCircle, ...styles.stepCirclePending }}>4</div>
            <span style={{ ...styles.stepLabel, ...styles.stepLabelPending }}>Connect</span>
          </div>
        </div>
      </div>

      {/* Vertical Steps */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Vertical Steps</h2>
        <div style={styles.verticalIndicator}>
          {/* Step 1 - Completed */}
          <div style={styles.verticalStep}>
            <div style={styles.verticalStepContent}>
              <div style={{ ...styles.stepCircle, ...styles.stepCircleCompleted, width: '32px', height: '32px', fontSize: '12px' }}>&#10003;</div>
              <div style={{ ...styles.verticalConnector, ...styles.verticalConnectorCompleted }}></div>
            </div>
            <div style={styles.verticalInfo}>
              <p style={{ ...styles.verticalLabel, color: '#059669' }}>Pet Selected</p>
              <p style={styles.verticalDescription}>Max - Golden Retriever</p>
            </div>
          </div>

          {/* Step 2 - Current */}
          <div style={styles.verticalStep}>
            <div style={styles.verticalStepContent}>
              <div style={{ ...styles.stepCircle, ...styles.stepCircleCurrent, width: '32px', height: '32px', fontSize: '12px' }}>2</div>
              <div style={styles.verticalConnector}></div>
            </div>
            <div style={styles.verticalInfo}>
              <p style={{ ...styles.verticalLabel, color: '#1E5081' }}>Describe Symptoms</p>
              <p style={styles.verticalDescription}>Tell us what's concerning you</p>
            </div>
          </div>

          {/* Step 3 - Pending */}
          <div style={styles.verticalStep}>
            <div style={styles.verticalStepContent}>
              <div style={{ ...styles.stepCircle, ...styles.stepCirclePending, width: '32px', height: '32px', fontSize: '12px' }}>3</div>
              <div style={styles.verticalConnector}></div>
            </div>
            <div style={styles.verticalInfo}>
              <p style={{ ...styles.verticalLabel, color: '#9CA3AF' }}>Review & Pay</p>
              <p style={styles.verticalDescription}>Confirm details and payment</p>
            </div>
          </div>

          {/* Step 4 - Pending */}
          <div style={styles.verticalStep}>
            <div style={styles.verticalStepContent}>
              <div style={{ ...styles.stepCircle, ...styles.stepCirclePending, width: '32px', height: '32px', fontSize: '12px' }}>4</div>
            </div>
            <div style={styles.verticalInfo}>
              <p style={{ ...styles.verticalLabel, color: '#9CA3AF' }}>Connect with Vet</p>
              <p style={styles.verticalDescription}>Video call with available vet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Mobile Dots */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Compact Mobile (Dots)</h2>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px', maxWidth: '320px' }}>
          <div style={styles.compactIndicator}>
            <div style={{ ...styles.compactDot, ...styles.compactDotCurrent }}></div>
            <div style={{ ...styles.compactDot, ...styles.compactDotPending }}></div>
            <div style={{ ...styles.compactDot, ...styles.compactDotPending }}></div>
            <span style={styles.compactText}>Step 1 of 3</span>
          </div>
          <div style={styles.compactIndicator}>
            <div style={{ ...styles.compactDot, ...styles.compactDotCompleted }}></div>
            <div style={{ ...styles.compactDot, ...styles.compactDotCurrent }}></div>
            <div style={{ ...styles.compactDot, ...styles.compactDotPending }}></div>
            <span style={styles.compactText}>Step 2 of 3</span>
          </div>
          <div style={styles.compactIndicator}>
            <div style={{ ...styles.compactDot, ...styles.compactDotCompleted }}></div>
            <div style={{ ...styles.compactDot, ...styles.compactDotCompleted }}></div>
            <div style={{ ...styles.compactDot, ...styles.compactDotCurrent }}></div>
            <span style={styles.compactText}>Step 3 of 3</span>
          </div>
        </div>
      </div>

      {/* Progress Bar Style */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Progress Bar Style</h2>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '24px', maxWidth: '320px' }}>
          <div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: '33%' }}></div>
            </div>
            <div style={styles.progressLabels}>
              <span style={{ ...styles.progressLabel, ...styles.progressLabelActive }}>Pet</span>
              <span style={styles.progressLabel}>Symptoms</span>
              <span style={styles.progressLabel}>Confirm</span>
            </div>
          </div>
          <div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: '66%' }}></div>
            </div>
            <div style={styles.progressLabels}>
              <span style={{ ...styles.progressLabel, color: '#059669' }}>Pet</span>
              <span style={{ ...styles.progressLabel, ...styles.progressLabelActive }}>Symptoms</span>
              <span style={styles.progressLabel}>Confirm</span>
            </div>
          </div>
          <div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: '100%' }}></div>
            </div>
            <div style={styles.progressLabels}>
              <span style={{ ...styles.progressLabel, color: '#059669' }}>Pet</span>
              <span style={{ ...styles.progressLabel, color: '#059669' }}>Symptoms</span>
              <span style={{ ...styles.progressLabel, ...styles.progressLabelActive }}>Confirm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
