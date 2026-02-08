// AuthPage.tsx - Login/Signup Page Layout
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
  // Mobile phone frame
  phoneFrame: {
    width: '320px',
    height: '640px',
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    border: '8px solid #303344',
    overflow: 'hidden',
    position: 'relative' as const,
    boxShadow: '0 20px 40px rgba(48, 51, 68, 0.2)',
  },
  // Auth page container
  authPage: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '32px 24px',
  },
  // Logo section
  logoSection: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  logo: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1E5081',
    marginBottom: '8px',
  },
  tagline: {
    fontSize: '14px',
    color: '#6B7280',
  },
  // Form section
  formSection: {
    flex: 1,
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#303344',
    marginBottom: '8px',
  },
  formSubtitle: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '24px',
  },
  // Input field
  inputGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#303344',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '16px',
    border: '1.5px solid #E5E7EB',
    borderRadius: '8px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  inputFocus: {
    borderColor: '#1E5081',
    boxShadow: '0 0 0 3px rgba(30, 80, 129, 0.1)',
  },
  inputError: {
    borderColor: '#CE3E24',
  },
  errorText: {
    fontSize: '12px',
    color: '#CE3E24',
    marginTop: '4px',
  },
  // Button
  buttonPrimary: {
    width: '100%',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: '#1E5081',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  buttonSecondary: {
    width: '100%',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: 600,
    backgroundColor: 'transparent',
    color: '#464A5C',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  // Divider
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
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
  },
  // Link
  link: {
    color: '#7796CC',
    textDecoration: 'none',
    fontWeight: 500,
  },
  // Footer
  footer: {
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#6B7280',
  },
  // OTP input
  otpContainer: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  otpInput: {
    width: '44px',
    height: '52px',
    textAlign: 'center' as const,
    fontSize: '20px',
    fontWeight: 600,
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    outline: 'none',
  },
  otpInputFilled: {
    borderColor: '#1E5081',
    backgroundColor: 'rgba(30, 80, 129, 0.05)',
  },
  // Resend timer
  resendContainer: {
    textAlign: 'center' as const,
    marginBottom: '24px',
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
  },
  // Notice box
  noticeBox: {
    backgroundColor: '#F9F6E8',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '16px',
  },
  noticeText: {
    fontSize: '13px',
    color: '#6B7280',
    lineHeight: 1.5,
    margin: 0,
  },
};

export default function AuthPage() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Authentication Pages
      </h1>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' as const }}>
        {/* Customer Login - Email Entry */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Customer Login (Email Entry)</h2>
          <div style={styles.phoneFrame}>
            <div style={styles.authPage}>
              <div style={styles.logoSection}>
                <div style={styles.logo}>furrie</div>
                <div style={styles.tagline}>Connect with vets instantly</div>
              </div>

              <div style={styles.formSection}>
                <h1 style={styles.formTitle}>Welcome!</h1>
                <p style={styles.formSubtitle}>Enter your email to continue</p>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    style={styles.input}
                  />
                </div>

                <button style={styles.buttonPrimary}>Continue</button>

                <div style={styles.divider}>
                  <div style={styles.dividerLine}></div>
                  <span style={styles.dividerText}>or</span>
                  <div style={styles.dividerLine}></div>
                </div>

                <button style={styles.buttonSecondary}>
                  <span>G</span>
                  Continue with Google
                </button>
              </div>

              <div style={styles.footer}>
                <span>New to Furrie? </span>
                <a href="#" style={styles.link}>Create account</a>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Login - OTP Entry */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Customer Login (OTP Entry)</h2>
          <div style={styles.phoneFrame}>
            <div style={styles.authPage}>
              <div style={styles.logoSection}>
                <div style={styles.logo}>furrie</div>
              </div>

              <div style={styles.formSection}>
                <h1 style={styles.formTitle}>Enter OTP</h1>
                <p style={styles.formSubtitle}>
                  We sent a 6-digit code to<br />
                  <strong>john@example.com</strong>
                </p>

                <div style={styles.otpContainer}>
                  <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpInputFilled }} value="3" readOnly />
                  <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpInputFilled }} value="8" readOnly />
                  <input type="text" maxLength={1} style={{ ...styles.otpInput, ...styles.otpInputFilled }} value="5" readOnly />
                  <input type="text" maxLength={1} style={styles.otpInput} />
                  <input type="text" maxLength={1} style={styles.otpInput} />
                  <input type="text" maxLength={1} style={styles.otpInput} />
                </div>

                <div style={styles.resendContainer}>
                  <span style={styles.resendText}>Didn't receive code? </span>
                  <button style={styles.resendButton}>Resend in 45s</button>
                </div>

                <button style={styles.buttonPrimary}>Verify</button>
              </div>

              <div style={styles.footer}>
                <a href="#" style={styles.link}>Use a different email</a>
              </div>
            </div>
          </div>
        </div>

        {/* Vet Login - Password */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Vet Portal Login</h2>
          <div style={styles.phoneFrame}>
            <div style={styles.authPage}>
              <div style={styles.logoSection}>
                <div style={styles.logo}>furrie</div>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6B7280',
                  marginTop: '4px',
                }}>VET PORTAL</div>
              </div>

              <div style={styles.formSection}>
                <h1 style={styles.formTitle}>Login</h1>
                <p style={styles.formSubtitle}>
                  Enter your credentials to access the vet portal
                </p>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    style={styles.input}
                  />
                </div>

                <button style={styles.buttonPrimary}>Login</button>

                <div style={styles.noticeBox}>
                  <p style={styles.noticeText}>
                    Vet accounts are provisioned by administrators.
                    Contact support if you need access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Login */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Admin Portal Login</h2>
          <div style={styles.phoneFrame}>
            <div style={styles.authPage}>
              <div style={styles.logoSection}>
                <div style={styles.logo}>furrie</div>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#303344',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  marginTop: '4px',
                }}>ADMIN</div>
              </div>

              <div style={styles.formSection}>
                <h1 style={styles.formTitle}>Admin Login</h1>
                <p style={styles.formSubtitle}>
                  Restricted access. Authorized personnel only.
                </p>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    placeholder="admin@furrie.in"
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    style={styles.input}
                  />
                </div>

                <button style={styles.buttonPrimary}>Login</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error States */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Error States</h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' as const }}>
          {/* Invalid Email */}
          <div style={{ maxWidth: '280px', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Invalid Email</span>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value="invalid-email"
                style={{ ...styles.input, ...styles.inputError }}
                readOnly
              />
              <div style={styles.errorText}>Please enter a valid email address</div>
            </div>
          </div>

          {/* Invalid OTP */}
          <div style={{ maxWidth: '280px', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Invalid OTP</span>
            <div style={{ ...styles.otpContainer, justifyContent: 'flex-start' }}>
              <input type="text" maxLength={1} style={{ ...styles.otpInput, borderColor: '#CE3E24' }} value="1" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, borderColor: '#CE3E24' }} value="2" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, borderColor: '#CE3E24' }} value="3" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, borderColor: '#CE3E24' }} value="4" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, borderColor: '#CE3E24' }} value="5" readOnly />
              <input type="text" maxLength={1} style={{ ...styles.otpInput, borderColor: '#CE3E24' }} value="6" readOnly />
            </div>
            <div style={{ ...styles.errorText, textAlign: 'center' as const }}>Invalid code. Please try again.</div>
          </div>

          {/* Wrong Account Type */}
          <div style={{ maxWidth: '280px', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Wrong Portal</span>
            <div style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #CE3E24',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <span style={{ color: '#CE3E24', fontSize: '18px' }}>!</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#CE3E24', marginBottom: '2px' }}>Wrong Account Type</div>
                <div style={{ fontSize: '13px', color: '#464A5C' }}>This account is registered as a customer. Please use the customer portal.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
