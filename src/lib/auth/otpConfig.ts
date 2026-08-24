/**
 * Length of the email OTP the customer portal asks users to type.
 *
 * This MUST match Supabase's configured OTP length
 * (Dashboard → Authentication → Sign In / Providers → Email → OTP Length).
 * If the two disagree, the verify button never enables and login dead-ends
 * silently — the user sees a valid code that the form refuses to accept.
 *
 * Exposed as an env var so a dashboard change can be matched by a config
 * update rather than a code change. Defaults to 8, the value the portal
 * has always hardcoded. Values outside Supabase's supported 6–10 range
 * fall back to the default rather than producing an unusable form.
 */
const parsed = Number.parseInt(process.env.NEXT_PUBLIC_OTP_LENGTH ?? '', 10);

export const OTP_LENGTH =
  Number.isInteger(parsed) && parsed >= 6 && parsed <= 10 ? parsed : 8;
