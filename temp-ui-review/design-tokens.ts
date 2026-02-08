// Design Tokens for Furrie
// These are the current design values - reference when editing components

export const tokens = {
  colors: {
    // Brand Colors
    primary: '#1E5081',      // Dusk Blue
    primaryLight: '#2B6299',
    primaryDark: '#153B61',

    secondary: '#7796CC',    // Light Blue
    secondaryHover: '#5E80BD',

    accent: '#CE3E24',       // Bright Red
    accentLight: '#E85D44',
    accentDark: '#A93119',

    // Background
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F9F6E8',  // Warm Beige Light
    bgTertiary: '#F2EAC3',   // Warm Beige

    // Text
    textPrimary: '#303344',   // Jet Blue
    textSecondary: '#464A5C',
    textTertiary: '#6B7280',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',

    // Links
    link: '#7796CC',
    linkHover: '#5E80BD',

    // Borders
    border: '#E5E7EB',
    borderLight: '#F0F0F0',
    borderFocus: '#1E5081',

    // Status
    success: '#059669',
    successLight: '#D1FAE5',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    error: '#CE3E24',
    errorLight: '#FEE2E2',
    info: '#7796CC',
    infoLight: '#DBEAFE',
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px',
  },

  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  shadow: {
    sm: '0 1px 2px rgba(48, 51, 68, 0.04)',
    md: '0 4px 6px -1px rgba(48, 51, 68, 0.1), 0 2px 4px -1px rgba(48, 51, 68, 0.06)',
    lg: '0 10px 15px -3px rgba(48, 51, 68, 0.1), 0 4px 6px -4px rgba(48, 51, 68, 0.05)',
    xl: '0 20px 25px -5px rgba(48, 51, 68, 0.1), 0 8px 10px -6px rgba(48, 51, 68, 0.04)',
    elevated: '0 12px 24px -4px rgba(48, 51, 68, 0.12), 0 8px 12px -4px rgba(48, 51, 68, 0.08)',
  },

  transition: {
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease-out',
  },
};

// Helper to create inline styles object
export const createStyles = (styleObject: Record<string, string | number>) => styleObject;
