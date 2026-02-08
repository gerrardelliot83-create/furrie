# UI Review Guide for Claude Desktop

## How to Use These Files

1. Copy the contents of any `.tsx` file from this folder
2. Paste it into Claude Desktop and ask: "Please render this as a React artifact"
3. Review the UI and provide feedback like:
   - "Make the primary button more rounded"
   - "Use a softer shadow on the cards"
   - "Change the badge colors to be less saturated"
4. Claude Desktop will update the code
5. Copy the updated code
6. Save it as `ComponentName_updated.tsx` in the same folder (e.g., `Buttons_updated.tsx`)

## CRITICAL: Compatibility Rules

### SAFE to Change (Style Values Only)
- Color values (hex: `#XXXXXX`, rgb, hsl)
- Border radius (`8px`, `12px`, `16px`, etc.)
- Box shadow values
- Padding/margin numbers (`16px`, `24px`, etc.)
- Font size (`14px`, `16px`, `18px`, etc.)
- Font weight (`400`, `500`, `600`, `700`)
- Opacity values (`0` to `1`)
- Gap/spacing values
- Background gradients

### DO NOT Change
- Component structure (the HTML/div hierarchy)
- Event handlers (onClick, onChange, etc.)
- Prop names or TypeScript interfaces
- CSS property names (only change values, not names)
- Accessibility attributes (aria-*, role)
- State management or React hooks
- Import statements (ignore them, they're for reference)

## Current Brand Tokens

These are the current design values. Refer to these when suggesting changes:

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#1E5081` | Dusk Blue - primary buttons, headers |
| Primary Light | `#2B6299` | Hover states |
| Primary Dark | `#153B61` | Active states |
| Secondary | `#7796CC` | Light Blue - links, secondary actions |
| Accent | `#CE3E24` | Bright Red - CTAs, alerts |
| Accent Light | `#E85D44` | Hover states |
| Accent Dark | `#A93119` | Active states |
| Background Primary | `#FFFFFF` | White - main background |
| Background Secondary | `#F9F6E8` | Warm Beige - cards, sections |
| Background Tertiary | `#F2EAC3` | Beige - alternate sections |
| Text Primary | `#303344` | Jet Blue - body text |
| Text Secondary | `#464A5C` | Lighter text |
| Text Tertiary | `#6B7280` | Muted text |
| Border | `#E5E7EB` | Default borders |
| Success | `#059669` | Success states |
| Warning | `#D97706` | Warning states |
| Error | `#CE3E24` | Error states (same as accent) |
| Info | `#7796CC` | Info states (same as secondary) |

### Spacing (8px Base Scale)
| Token | Value |
|-------|-------|
| space-1 | `4px` |
| space-2 | `8px` |
| space-3 | `12px` |
| space-4 | `16px` |
| space-5 | `20px` |
| space-6 | `24px` |
| space-8 | `32px` |
| space-10 | `40px` |
| space-12 | `48px` |

### Border Radius
| Token | Value |
|-------|-------|
| radius-sm | `6px` |
| radius-md | `8px` |
| radius-lg | `12px` |
| radius-xl | `16px` |
| radius-2xl | `20px` |
| radius-full | `9999px` (pill) |

### Shadows
| Token | Value |
|-------|-------|
| shadow-sm | `0 1px 2px rgba(48, 51, 68, 0.04)` |
| shadow-md | `0 4px 6px -1px rgba(48, 51, 68, 0.1), 0 2px 4px -1px rgba(48, 51, 68, 0.06)` |
| shadow-lg | `0 10px 15px -3px rgba(48, 51, 68, 0.1), 0 4px 6px -4px rgba(48, 51, 68, 0.05)` |
| shadow-elevated | `0 12px 24px -4px rgba(48, 51, 68, 0.12), 0 8px 12px -4px rgba(48, 51, 68, 0.08)` |

### Typography
| Token | Value |
|-------|-------|
| font-family | `'Epilogue', sans-serif` |
| font-size-xs | `12px` |
| font-size-sm | `14px` |
| font-size-base | `16px` |
| font-size-lg | `18px` |
| font-size-xl | `20px` |
| font-size-2xl | `24px` |
| font-weight-normal | `400` |
| font-weight-medium | `500` |
| font-weight-semibold | `600` |
| font-weight-bold | `700` |

## Folder Structure

```
temp-ui-review/
├── README.md              # This file
├── design-tokens.ts       # Tokens as JS object
├── 01-core-ui/           # Base UI components
│   ├── Buttons.tsx       # All button variants
│   ├── Cards.tsx         # Card component
│   ├── Badges.tsx        # Status badges
│   ├── Inputs.tsx        # Form inputs
│   ├── Modal.tsx         # Modal dialog
│   └── Misc.tsx          # Avatar, Skeleton, Toast
├── 02-layouts/           # Navigation & layouts
│   ├── CustomerNav.tsx   # Mobile bottom nav
│   ├── VetSidebar.tsx    # Vet sidebar
│   └── AuthPage.tsx      # Login page layout
├── 03-customer/          # Customer portal
│   ├── PetCard.tsx       # Pet list card
│   ├── Dashboard.tsx     # Customer dashboard
│   └── OTPInput.tsx      # OTP digit boxes
├── 04-consultation/      # Consultation flow
│   ├── ConsultationCard.tsx
│   ├── StepIndicator.tsx
│   └── VideoRoom.tsx
├── 05-vet/               # Vet portal
│   ├── Dashboard.tsx
│   ├── ConsultationTable.tsx
│   └── SOAPForm.tsx
└── 06-admin/             # Admin portal
    └── Dashboard.tsx
```

## Workflow Summary

1. **Review** - Open a file, preview in Claude Desktop artifact
2. **Edit** - Tell Claude what to change (colors, spacing, shadows)
3. **Save** - Copy updated code, save as `Name_updated.tsx`
4. **Apply** - Return to Claude Code, I'll map changes to CSS Modules

## Important Notes

- **NO EMOJIS** - The design system forbids emojis
- **Mobile-first** - Customer portal targets 320px+ viewport
- **Touch targets** - All interactive elements must be 44x44px minimum
- **16px minimum font** - For form inputs to prevent iOS zoom
