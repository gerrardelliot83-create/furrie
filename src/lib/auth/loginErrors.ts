/**
 * What the login pages show for the `?error=` codes the middleware and the
 * admin layout guard put on /login (C-03, D-05). Shared by the customer, admin
 * and vet login forms so the wording stays the same everywhere.
 */
export const ACCOUNT_ERROR_MESSAGES: Record<string, string> = {
  account_disabled: 'This account has been turned off. Contact support@furrie.in.',
  no_profile: "We couldn't find your account. Please sign in again.",
};
