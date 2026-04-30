# Furrie Platform — Comprehensive Testing Report

**Date:** 11 April 2026
**Branch:** `feat/pre-launch-treatment-plan-and-credits` (merged to main)
**Deployment:** Vercel production (app.furrie.in / admin.furrie.in / vet.furrie.in)
**Tested by:** Claude (browser testing via Chrome extension)

---

## Executive Summary

28 fixes from the previous session were committed, merged, and deployed. Post-deployment browser testing confirmed that the core fixes are working, but uncovered **5 new issues** — 2 critical, 2 moderate, and 1 low severity. No code changes have been made; this report documents findings only.

---

## Test Results Overview

| Area | Tests Run | Passed | Failed | Blocked |
|------|-----------|--------|--------|---------|
| Customer Dashboard | 4 | 4 | 0 | 0 |
| Credit Request Modal | 5 | 4 | 1 | 0 |
| Admin Credit Requests Page | 8 | 4 | 4 | 0 |
| Invite System (APIs) | 5 | 4 | 0 | 1 |
| Vet Portal | 2 | 2 | 0 | 0 |
| Admin Portal (General) | 4 | 3 | 1 | 0 |
| Feature Flag Gates | 3 | 3 | 0 | 0 |
| Edge Cases | 3 | 3 | 0 | 0 |
| **Total** | **34** | **27** | **5** | **1** |

---

## Confirmed Fixes (Working Correctly)

### M10 — Dashboard Greeting Fix
- **Status:** PASS
- **Details:** Dashboard displays "Good morning, there!" instead of "Good morning, User!" when the profile full_name is the default "User" value. The fallback logic works correctly.

### C1 — Credit Request Modal
- **Status:** PASS
- **Details:** Navigating to `/connect?requestCredits=true` opens the "Request More Consultations" modal. The form renders correctly with quantity buttons (3, 5, 10, custom), contact preference dropdown (WhatsApp/Phone/Email), phone field, and notes field. Submission works and creates a record in the database. Duplicate submission prevention works ("You already have a pending request").

### C2 — Admin Credit Requests Page
- **Status:** PARTIAL PASS
- **Details:** The page loads at `/credit-requests`, sidebar link is present, filter buttons (All/Pending/Contacted/Fulfilled/Cancelled) work, and the data table renders rows. However, several data columns show dashes due to a field name mismatch (see Issue #1 below).

### C3 — Feature Flag Gates
- **Status:** PASS
- **Details:** All invite endpoints (`/api/invites/mine`, `/api/invites/validate`, `/api/invites/redeem`) and the consultation-requests endpoint are properly gated by `FEATURES.ENABLE_INVITES` and `FEATURES.ENABLE_PACK_REQUESTS` respectively. APIs return correct responses when flags are enabled.

### L6 — Invite Redeem Race Condition Fix
- **Status:** PASS
- **Details:** The `/api/invites/redeem` endpoint correctly uses an optimistic lock (updating with `eq('status', 'available')`) to prevent race conditions. Invalid codes return 400, and the self-referral check is in place.

### Invite API Validation
- **Status:** PASS
- **Details:** `/api/invites/validate` returns `{ valid: false }` for non-existent codes. `/api/invites/redeem` returns 400 with `INVALID_CODE` for fake codes. `/api/invites/check-referrer-reward` returns 400 requiring `consultationId`.

---

## Issues Found

### Issue #1 — CRITICAL: Admin Credit Requests Field Name Mismatch

**Severity:** Critical
**Location:** `src/app/admin-portal/(app)/credit-requests/page.tsx`
**Symptom:** The Quantity, Contact Preference, Phone, and Notes columns all display "-" (dashes) for every row.

**Root Cause:** The `CreditRequest` TypeScript interface in the page component uses different field names than what the database/API returns:

| Page Interface Field | Actual DB Column |
|---------------------|------------------|
| `quantity_requested` | `requested_quantity` |
| `contact_preference` | `preferred_contact` |
| `phone` | `contact_phone` |
| `notes` | `note` |

The JSX renders `r.quantity_requested`, `r.contact_preference`, etc., which are all `undefined` on the actual API response objects, causing the fallback "-" to display.

**Impact:** Admins cannot see the quantity requested, how the customer wants to be contacted, their phone number, or any notes — making the credit requests page essentially non-functional for its intended workflow.

---

### Issue #2 — CRITICAL: Admin Cancel Action Fails with DB_ERROR (500)

**Severity:** Critical
**Location:** `src/app/api/admin/consultation-requests/route.ts` (PATCH handler, `cancel` case)
**Symptom:** Clicking "Cancel" on any credit request returns HTTP 500 `{ error: "Failed to update request", code: "DB_ERROR" }`.

**Root Cause:** The cancel action in the PATCH handler sets `cancelled_by_admin_id` and `cancelled_at` in the update payload:

```typescript
updates.cancelled_by_admin_id = user.id;
updates.cancelled_at = new Date().toISOString();
```

These columns do **not exist** in the `consultation_credit_requests` database table. Supabase rejects the update with an error.

**Impact:** Admins cannot cancel any credit request. The Cancel button is completely broken.

**Verified:** API test returned `{ status: 500, data: { error: "Failed to update request", code: "DB_ERROR" } }`.

---

### Issue #3 — MODERATE: Admin Contact Action Crashes UI ("totalCount must be between 1 and 50")

**Severity:** Moderate
**Location:** `src/app/admin-portal/(app)/credit-requests/page.tsx` (client-side refetch logic)
**Symptom:** Clicking "Contact" on a pending request causes the entire data table to disappear, replaced by the error message "totalCount must be between 1 and 50".

**Root Cause:** The backend PATCH API for `contact` action works correctly (verified via direct API call — returns 200). The error occurs in the client-side logic that refetches the request list after a successful action. The page's data fetching or state update code appears to pass an invalid `totalCount` parameter to Supabase or a pagination utility.

**Impact:** After clicking Contact, the admin sees an error and must manually refresh the page to see the updated list. The actual status update does succeed server-side.

**Note:** After manual page refresh, the request correctly shows as "contacted".

---

### Issue #4 — MODERATE: Credit Request Modal Shows No Success Confirmation

**Severity:** Moderate
**Location:** `src/components/customer/ConsultationRequestModal.tsx` (or equivalent)
**Symptom:** After successfully submitting a credit request, the modal closes but there is no visible success toast or confirmation message to the user.

**Root Cause:** The submission handler likely does not call `toast()` with a success message after a successful POST. The user has no feedback that their request was received, other than seeing the "Request submitted" text on the dashboard balance card on next visit.

**Impact:** Users may be confused about whether their request went through and might attempt to resubmit (which is handled by the duplicate check, but creates a poor UX).

---

### Issue #5 — LOW: Admin Vets Page Renders Duplicate Table

**Severity:** Low
**Location:** `src/app/admin-portal/(app)/vets/page.tsx`
**Symptom:** The Vets page renders the heading "Vets (1)", the "+ Create Vet" button, and the entire vets table twice on the same page.

**Root Cause:** Likely a duplicate rendering issue — the page component may be rendering the content both in a server component wrapper and in a client component, or there is a stale duplicate block in the JSX.

**Impact:** Visual clutter only. Both tables show correct data. Functionality is not affected.

---

## Blocked Tests

### Invite Card Display (Blocked — Backfill Migration Not Run)

**Status:** BLOCKED
**Details:** The `/api/invites/mine` endpoint returns `{ invites: [] }` because migration `017_backfill_invite_codes.sql` has not been run against the production database. Without invite codes in the DB, the InviteCard component returns `null` (doesn't render), and the share buttons (Copy Link, WhatsApp, Email) cannot be tested.

**Action Required:** Run `npx supabase db push` or execute migration 017 manually against the production Supabase instance. After that, each existing customer should have an invite code, and the InviteCard will render on the dashboard.

---

## Additional Observations

### Invite Code Lost for Logged-In Users
When an already-logged-in user visits `/signup?invite=TEST-1234`, the middleware redirects to `/dashboard?invite=TEST-1234`. The AuthForm never mounts, so the invite code is never saved to sessionStorage. For new users this isn't an issue (they see the AuthForm), but for existing users clicking a friend's invite link while already logged in, the code is lost. This is an edge case worth considering in a future iteration.

### Dashboard Balance Card
The consultation balance card correctly shows "consultations available" and "Request submitted for 5 consultations — our team will reach out shortly" for the test user who already submitted a request. The balance card and request status display are working.

### Vet Portal
The vet portal correctly redirects unauthenticated users to `/login` with a `redirectTo` parameter. The login page renders properly with email/password fields, forgot password button, and the "Vet accounts are provisioned by administrators" notice.

### Admin Portal Navigation
All admin sidebar links work: Dashboard, Users, Vets, Consultations, Credit Requests, Subscriptions, Settings. The Users page correctly shows 7 users with action buttons. The Dashboard shows stats cards and recent activity.

---

## Recommended Fix Priority

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | #1 — Field name mismatch (admin credit requests) | Low — rename 4 interface fields |
| 2 | #2 — Cancel action DB_ERROR | Low — remove 2 nonexistent columns from update payload |
| 3 | #3 — Contact action UI crash | Medium — debug client-side refetch/pagination logic |
| 4 | #4 — No success confirmation on modal submit | Low — add toast call after successful POST |
| 5 | #5 — Duplicate vets table | Low — remove duplicate JSX block |

---

## Next Steps

1. Review this report and approve the proposed fix plan.
2. Run backfill migration 017 against production to enable invite codes.
3. After fixes are approved and implemented, re-run browser testing to verify all issues are resolved.
