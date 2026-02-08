// OTPInput.tsx - OTP Input Component
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
    gap: '24px',
    marginBottom: '16px',
  },
  // OTP container
  otpContainer: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  otpContainerCompact: {
    gap: '8px',
  },
  // OTP input base
  otpInput: {
    width: '48px',
    height: '56px',
    textAlign: 'center' as const,
    fontSize: '24px',
    fontWeight: 600,
    color: '#303344',
    backgroundColor: '#FFFFFF',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.15s ease',
    fontFamily: "'Epilogue', sans-serif",
  },
  // OTP states
  otpEmpty: {
    borderColor: '#E5E7EB',
  },
  otpFocused: {
    borderColor: '#1E5081',
    boxShadow: '0 0 0 3px rgba(30, 80, 129, 0.15)',
  },
  otpFilled: {
    borderColor: '#1E5081',
    backgroundColor: 'rgba(30, 80, 129, 0.03)',
  },
  otpError: {
    borderColor: '#CE3E24',
    backgroundColor: '#FEF2F2',
    color: '#CE3E24',
  },
  otpSuccess: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
    color: '#059669',
  },
  otpDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    color: '#9CA3AF',
  },
  // OTP sizes
  otpSm: {
    width: '40px',
    height: '48px',
    fontSize: '20px',
  },
  otpLg: {
    width: '56px',
    height: '64px',
    fontSize: '28px',
  },
  // Helper text
  helpText: {
    fontSize: '14px',
    color: '#6B7280',
    textAlign: 'center' as const,
    marginTop: '16px',
  },
  errorText: {
    fontSize: '14px',
    color: '#CE3E24',
    textAlign: 'center' as const,
    marginTop: '16px',
  },
  successText: {
    fontSize: '14px',
    color: '#059669',
    textAlign: 'center' as const,
    marginTop: '16px',
  },
  // Resend section
  resendSection: {
    textAlign: 'center' as const,
    marginTop: '24px',
  },
  resendText: {
    fontSize: '14px',
    color: '#6B7280',
  },
  resendButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#7796CC',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px',
  },
  resendButtonDisabled: {
    color: '#9CA3AF',
    cursor: 'not-allowed',
  },
  // Timer badge
  timerBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#F3F4F6',
    borderRadius: '9999px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6B7280',
    marginTop: '8px',
  },
  // Full width context
  contextBox: {
    maxWidth: '320px',
    padding: '24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
  },
  contextTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#303344',
    textAlign: 'center' as const,
    margin: '0 0 8px 0',
  },
  contextSubtitle: {
    fontSize: '14px',
    color: '#6B7280',
    textAlign: 'center' as const,
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  // Verify button
  verifyButton: {
    width: '100%',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '24px',
  },
  verifyButtonDisabled: {
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
    cursor: 'not-allowed',
  },
  verifyButtonLoading: {
    backgroundColor: '#1E5081',
    position: 'relative' as const,
  },
};

export default function OTPInput() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        OTP Input Component
      </h1>

      {/* OTP States */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>OTP Input States</h2>
        <div style={styles.row}>
          {/* Empty */}
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Empty</span>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
            </div>
          </div>

          {/* Focused */}
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Focused</span>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="8" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFocused }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
            </div>
          </div>
        </div>

        <div style={styles.row}>
          {/* Filled */}
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Filled</span>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="8" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="5" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="2" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="9" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="1" readOnly />
            </div>
          </div>

          {/* Error */}
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Error</span>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="1" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="2" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="4" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="5" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="6" readOnly />
            </div>
            <div style={styles.errorText}>Invalid code. Please try again.</div>
          </div>
        </div>

        <div style={styles.row}>
          {/* Success */}
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Success</span>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSuccess }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSuccess }} value="8" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSuccess }} value="5" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSuccess }} value="2" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSuccess }} value="9" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSuccess }} value="1" readOnly />
            </div>
            <div style={styles.successText}>Code verified successfully!</div>
          </div>

          {/* Disabled */}
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Disabled</span>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpDisabled }} disabled />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpDisabled }} disabled />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpDisabled }} disabled />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpDisabled }} disabled />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpDisabled }} disabled />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpDisabled }} disabled />
            </div>
          </div>
        </div>
      </div>

      {/* OTP Sizes */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>OTP Input Sizes</h2>
        <div style={styles.row}>
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Small</span>
            <div style={{ ...styles.otpContainer, ...styles.otpContainerCompact }}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSm, ...styles.otpFilled }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSm, ...styles.otpFilled }} value="8" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSm, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSm, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSm, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpSm, ...styles.otpEmpty }} />
            </div>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Large</span>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpLg, ...styles.otpFilled }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpLg, ...styles.otpFilled }} value="8" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpLg, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpLg, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpLg, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpLg, ...styles.otpEmpty }} />
            </div>
          </div>
        </div>
      </div>

      {/* Full Context Examples */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Full Context Examples</h2>
        <div style={styles.row}>
          {/* Entering Code */}
          <div style={styles.contextBox}>
            <h3 style={styles.contextTitle}>Enter verification code</h3>
            <p style={styles.contextSubtitle}>
              We sent a 6-digit code to<br />
              <strong>john@example.com</strong>
            </p>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="8" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFocused }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpEmpty }} />
            </div>
            <div style={styles.resendSection}>
              <span style={styles.resendText}>Didn't receive code? </span>
              <button style={{ ...styles.resendButton, ...styles.resendButtonDisabled }}>Resend in 45s</button>
            </div>
            <button style={{ ...styles.verifyButton, ...styles.verifyButtonDisabled }}>Verify</button>
          </div>

          {/* Ready to Verify */}
          <div style={styles.contextBox}>
            <h3 style={styles.contextTitle}>Enter verification code</h3>
            <p style={styles.contextSubtitle}>
              We sent a 6-digit code to<br />
              <strong>john@example.com</strong>
            </p>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="8" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="5" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="2" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="9" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpFilled }} value="1" readOnly />
            </div>
            <div style={styles.resendSection}>
              <span style={styles.resendText}>Didn't receive code? </span>
              <button style={styles.resendButton}>Resend</button>
            </div>
            <button style={styles.verifyButton}>Verify</button>
          </div>

          {/* Error State */}
          <div style={styles.contextBox}>
            <h3 style={styles.contextTitle}>Enter verification code</h3>
            <p style={styles.contextSubtitle}>
              We sent a 6-digit code to<br />
              <strong>john@example.com</strong>
            </p>
            <div style={styles.otpContainer}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="1" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="2" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="4" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="5" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpError }} value="6" readOnly />
            </div>
            <div style={styles.errorText}>Invalid code. 2 attempts remaining.</div>
            <div style={styles.resendSection}>
              <span style={styles.resendText}>Didn't receive code? </span>
              <button style={styles.resendButton}>Resend</button>
            </div>
            <button style={styles.verifyButton}>Try Again</button>
          </div>
        </div>
      </div>

      {/* Resend States */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Resend Timer States</h2>
        <div style={styles.row}>
          <div style={{ textAlign: 'center' as const }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Timer Active</span>
            <span style={styles.resendText}>Didn't receive code? </span>
            <button style={{ ...styles.resendButton, ...styles.resendButtonDisabled }}>Resend in 45s</button>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Can Resend</span>
            <span style={styles.resendText}>Didn't receive code? </span>
            <button style={styles.resendButton}>Resend</button>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Code Sent</span>
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#D1FAE5',
              borderRadius: '8px',
              color: '#059669',
              fontSize: '14px',
              fontWeight: 500,
            }}>New code sent!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
