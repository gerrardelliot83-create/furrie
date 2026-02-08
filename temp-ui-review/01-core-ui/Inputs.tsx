// Inputs.tsx - All Form Input Variants
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
  fieldWrapper: {
    minWidth: '280px',
    maxWidth: '320px',
  },
  stateLabel: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '8px',
    display: 'block',
  },
  // Label
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#303344',
    marginBottom: '6px',
  },
  labelRequired: {
    color: '#CE3E24',
    marginLeft: '2px',
  },
  // Help text
  helpText: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px',
  },
  errorText: {
    fontSize: '12px',
    color: '#CE3E24',
    marginTop: '4px',
  },
  // Base input
  inputBase: {
    width: '100%',
    fontFamily: "'Epilogue', sans-serif",
    fontSize: '16px', // 16px minimum to prevent iOS zoom
    fontWeight: 400,
    color: '#303344',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E5E7EB',
    borderRadius: '8px',
    padding: '12px 14px',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box' as const,
  },
  // Input states
  inputFocus: {
    borderColor: '#1E5081',
    boxShadow: '0 0 0 3px rgba(30, 80, 129, 0.1)',
  },
  inputError: {
    borderColor: '#CE3E24',
    boxShadow: '0 0 0 3px rgba(206, 62, 36, 0.1)',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
    cursor: 'not-allowed',
    borderColor: '#E5E7EB',
  },
  // Input sizes
  inputSm: {
    padding: '8px 12px',
    fontSize: '14px',
    borderRadius: '6px',
  },
  inputLg: {
    padding: '14px 16px',
    fontSize: '18px',
    borderRadius: '10px',
  },
  // Input with icon
  inputWrapper: {
    position: 'relative' as const,
  },
  inputWithIconLeft: {
    paddingLeft: '42px',
  },
  inputWithIconRight: {
    paddingRight: '42px',
  },
  inputIcon: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9CA3AF',
    fontSize: '18px',
  },
  inputIconLeft: {
    left: '14px',
  },
  inputIconRight: {
    right: '14px',
    cursor: 'pointer',
  },
  // Textarea
  textareaBase: {
    width: '100%',
    fontFamily: "'Epilogue', sans-serif",
    fontSize: '16px',
    fontWeight: 400,
    color: '#303344',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E5E7EB',
    borderRadius: '8px',
    padding: '12px 14px',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '100px',
    lineHeight: 1.5,
    boxSizing: 'border-box' as const,
  },
  // Select
  selectBase: {
    width: '100%',
    fontFamily: "'Epilogue', sans-serif",
    fontSize: '16px',
    fontWeight: 400,
    color: '#303344',
    backgroundColor: '#FFFFFF',
    border: '1.5px solid #E5E7EB',
    borderRadius: '8px',
    padding: '12px 40px 12px 14px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    boxSizing: 'border-box' as const,
  },
  selectPlaceholder: {
    color: '#9CA3AF',
  },
  // Checkbox & Radio base
  checkboxWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
  },
  checkboxInput: {
    width: '20px',
    height: '20px',
    accentColor: '#1E5081',
    cursor: 'pointer',
    marginTop: '2px',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#303344',
    lineHeight: 1.4,
  },
  // Search input
  searchInput: {
    width: '100%',
    fontFamily: "'Epilogue', sans-serif",
    fontSize: '16px',
    color: '#303344',
    backgroundColor: '#F9F6E8',
    border: '1.5px solid transparent',
    borderRadius: '9999px',
    padding: '10px 14px 10px 42px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  searchInputFocus: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E5081',
  },
};

export default function Inputs() {
  return (
    <div style={styles.container}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#303344', marginBottom: '32px' }}>
        Form Input Components
      </h1>

      {/* Text Inputs - States */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Text Input States</h2>
        <div style={styles.row}>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Default</span>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              style={styles.inputBase}
            />
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Focused</span>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              style={{ ...styles.inputBase, ...styles.inputFocus }}
            />
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>With Value</span>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value="user@furrie.in"
              style={styles.inputBase}
              readOnly
            />
          </div>
        </div>
        <div style={styles.row}>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Error</span>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value="invalid-email"
              style={{ ...styles.inputBase, ...styles.inputError }}
              readOnly
            />
            <div style={styles.errorText}>Please enter a valid email address</div>
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Disabled</span>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              style={{ ...styles.inputBase, ...styles.inputDisabled }}
              disabled
            />
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>With Help Text</span>
            <label style={styles.label}>
              Email Address<span style={styles.labelRequired}>*</span>
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              style={styles.inputBase}
            />
            <div style={styles.helpText}>We will send OTP to this email</div>
          </div>
        </div>
      </div>

      {/* Input Sizes */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Input Sizes</h2>
        <div style={styles.row}>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Small</span>
            <input
              type="text"
              placeholder="Small input"
              style={{ ...styles.inputBase, ...styles.inputSm }}
            />
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Medium (Default)</span>
            <input
              type="text"
              placeholder="Medium input"
              style={styles.inputBase}
            />
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Large</span>
            <input
              type="text"
              placeholder="Large input"
              style={{ ...styles.inputBase, ...styles.inputLg }}
            />
          </div>
        </div>
      </div>

      {/* Inputs with Icons */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Inputs with Icons</h2>
        <div style={styles.row}>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Icon Left (Search)</span>
            <div style={styles.inputWrapper}>
              <span style={{ ...styles.inputIcon, ...styles.inputIconLeft }}>&#128269;</span>
              <input
                type="text"
                placeholder="Search pets..."
                style={{ ...styles.inputBase, ...styles.inputWithIconLeft }}
              />
            </div>
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Icon Right (Password)</span>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <input
                type="password"
                value="password123"
                style={{ ...styles.inputBase, ...styles.inputWithIconRight }}
                readOnly
              />
              <span style={{ ...styles.inputIcon, ...styles.inputIconRight }}>&#128065;</span>
            </div>
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Phone Number</span>
            <label style={styles.label}>Phone</label>
            <div style={styles.inputWrapper}>
              <span style={{ ...styles.inputIcon, ...styles.inputIconLeft, fontSize: '14px' }}>+91</span>
              <input
                type="tel"
                placeholder="9876543210"
                style={{ ...styles.inputBase, paddingLeft: '48px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Select Dropdown */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Select Dropdown</h2>
        <div style={styles.row}>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Default</span>
            <label style={styles.label}>Pet Type</label>
            <select style={styles.selectBase}>
              <option value="" disabled selected>Select pet type</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
            </select>
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>With Selection</span>
            <label style={styles.label}>Pet Type</label>
            <select style={styles.selectBase} defaultValue="dog">
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
            </select>
          </div>
          <div style={styles.fieldWrapper}>
            <span style={styles.stateLabel}>Disabled</span>
            <label style={styles.label}>Pet Type</label>
            <select style={{ ...styles.selectBase, ...styles.inputDisabled }} disabled>
              <option value="dog">Dog</option>
            </select>
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Textarea</h2>
        <div style={styles.row}>
          <div style={{ ...styles.fieldWrapper, maxWidth: '400px' }}>
            <span style={styles.stateLabel}>Default</span>
            <label style={styles.label}>Describe symptoms</label>
            <textarea
              placeholder="Please describe what you've noticed..."
              style={styles.textareaBase}
            />
            <div style={styles.helpText}>Be as detailed as possible</div>
          </div>
          <div style={{ ...styles.fieldWrapper, maxWidth: '400px' }}>
            <span style={styles.stateLabel}>With Content</span>
            <label style={styles.label}>Describe symptoms</label>
            <textarea
              style={styles.textareaBase}
              defaultValue="My dog has been showing signs of lethargy for the past 2 days. He's eating less than usual and seems tired."
            />
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Checkboxes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          <label style={styles.checkboxWrapper}>
            <input type="checkbox" style={styles.checkboxInput} defaultChecked />
            <span style={styles.checkboxLabel}>
              I agree to the Terms of Service and Privacy Policy
            </span>
          </label>
          <label style={styles.checkboxWrapper}>
            <input type="checkbox" style={styles.checkboxInput} />
            <span style={styles.checkboxLabel}>
              Send me email updates about consultations
            </span>
          </label>
          <label style={{ ...styles.checkboxWrapper, opacity: 0.5, cursor: 'not-allowed' }}>
            <input type="checkbox" style={styles.checkboxInput} disabled />
            <span style={styles.checkboxLabel}>
              Disabled checkbox option
            </span>
          </label>
        </div>
      </div>

      {/* Radio Buttons */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Radio Buttons</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          <label style={styles.label}>Select pet gender</label>
          <label style={styles.checkboxWrapper}>
            <input type="radio" name="gender" style={styles.checkboxInput} defaultChecked />
            <span style={styles.checkboxLabel}>Male</span>
          </label>
          <label style={styles.checkboxWrapper}>
            <input type="radio" name="gender" style={styles.checkboxInput} />
            <span style={styles.checkboxLabel}>Female</span>
          </label>
          <label style={styles.checkboxWrapper}>
            <input type="radio" name="gender" style={styles.checkboxInput} />
            <span style={styles.checkboxLabel}>Unknown</span>
          </label>
        </div>
      </div>

      {/* Search Input */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Search Input (Pill Style)</h2>
        <div style={styles.row}>
          <div style={{ ...styles.fieldWrapper, maxWidth: '360px' }}>
            <span style={styles.stateLabel}>Default</span>
            <div style={styles.inputWrapper}>
              <span style={{ ...styles.inputIcon, ...styles.inputIconLeft }}>&#128269;</span>
              <input
                type="search"
                placeholder="Search for breeds..."
                style={styles.searchInput}
              />
            </div>
          </div>
          <div style={{ ...styles.fieldWrapper, maxWidth: '360px' }}>
            <span style={styles.stateLabel}>Focused</span>
            <div style={styles.inputWrapper}>
              <span style={{ ...styles.inputIcon, ...styles.inputIconLeft }}>&#128269;</span>
              <input
                type="search"
                placeholder="Search for breeds..."
                style={{ ...styles.searchInput, ...styles.searchInputFocus }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* OTP Input Preview */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>OTP Input (Preview)</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map((_, i) => (
            <input
              key={i}
              type="text"
              maxLength={1}
              style={{
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
              }}
              defaultValue={i < 3 ? String(i + 1) : ''}
            />
          ))}
        </div>
        <div style={styles.helpText}>Enter the 6-digit code sent to your email</div>
      </div>
    </div>
  );
}
