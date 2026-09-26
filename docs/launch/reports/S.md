# S report — Security & database rules (S-1)

PR: https://github.com/gerrardelliot83-create/furrie/pull/56 · Branch `launch/s-security` (from `main@e1cb38b`, `main@0564463` merged in) · Built by Agent S, 2026-09-27.
Plan: `furrie-launch/plans/S-plan.md` · Approval + Amendment 1: `furrie-launch/approvals/S.md`.

## In plain English

Before S-1, anyone who had signed up could make themselves an admin with one database call from their browser. Anyone could spend another customer's credits, book a free consultation by writing to the database directly, and list and download every consultation photo and document without signing in. The consultation "update" endpoint also accepted any field, so a customer could name themselves as the vet. After S-1:

- **The database refuses these on its own**, whatever the app does. Six SQL files lock it down: signed-out callers can't touch any table; users can't change their role; only the server can spend credits; vets can only complete, close or extend their consultations; consultation media is private. These files are safe with the code that's live now, so they can be applied before this PR merges.
- **The app only accepts what the screens send.** A customer can cancel their consultation or edit its concern, and nothing else. An in-time cancel gives the credit back (Terms §7.3).
- **"Deactivate" works in the app.** A deactivated account is signed out of every portal and refused by every API route (middleware, `getRequestUser()`, `verifyAdmin()`). It is **not yet enforced in the database or in Supabase Auth**: a deactivated user's still-valid token keeps its row-level rights on direct API calls until S-2 (backlog S-35: ban on deactivate, `is_active` inside `is_admin()`/`is_vet()`).
- **The password "backdoor" route is gone**, and sign-in links can no longer bounce people to another website.
- Nothing customers or vets use should change. The parked mobile app loses public links to its consultation media (4 test files).

## Commits

| Commit | Closes | What |
|---|---|---|
| `eba07ee` | S-20 (DB-1) | Migration 1: baseline for `is_admin()`, `is_vet()`, `can_vet_see_care_attachment()`, created only where missing (no-op on production) |
| `9918f6b` | S-14, S-15, **S-02 (SEC-4)**, SEC-7 | Migration 2: no anonymous table access (+ default privileges); `consume_pack_credit` and `validate_invite_code` server-only; trigger functions not callable; `is_admin()`/`is_vet()` hardened (`search_path ''`); tests s1_01, s1_02 |
| `fc95532` | **S-01 (SEC-5)** | Migration 3: users may update only name, phone, avatar, PIN code and push token on their own profile; test s1_03 |
| `6d59b5a` | **S-03**, S-07, S-08, S-09, S-10, S-11 (SEC-6) | Migration 4: no direct consultation inserts; consultation update guard; vet-profile column grants; care-plan step guard; customer follow-up thread policies dropped; credit-request insert pinned; tests s1_04–s1_07 |
| `baaa597` | **S-12**, S-13 | Migration 5: `consultation-media` private, own-folder/admin reads only; no anonymous pet-photo listing; test s1_09 |
| `55148db` | S-11 (seam 3) | Migration 6: customer INSERT on credit requests dropped (guarded on L1's SQL); test s1_08 |
| `bde26a4` | S-19 (P0R-2) | `safeNextPath()` for all sign-in redirects; `/set-password` kept; unit tests |
| `d69ca26` | S-18 (A-06) | `/api/admin/bootstrap/reset-password` deleted (D6 table in the commit message) |
| `b38126c` | S-16 (C-03), S-17 (D-05) | `is_active` enforced (getRequestUser, verifyAdmin, middleware); middleware fails closed; admin layout guard; routes reuse the loaded profile |
| `cad6797` | S-06 (A-03), S-21 (A-04) | Role check beside every assigned-vet check (soap-notes, extend, capture-treatment, follow-up thread, join); join uses the canonical `furrie-<id>` room |
| `a82471e` | **S-04 (SEC-3/A-01)**, S-05 (A-02) | Consultation PATCH: strict allowlist of the 3 real shapes; conditional writes; credit back on in-time cancel (seam 2); ratings embed normalised; unit tests |
| `b7f238a` | — | CI: one step runs the unit tests after the build |
| review fixes | S-19, S-16, S-17 | CTO review 2026-09-27: dot-segment redirect bypass closed; recovery fallback removed; login messages for `account_disabled` / `no_profile`; admin guard reasons; two caller-name reads folded; report wording (section below) |
| merge | — | `main@0564463` (W-app #55) merged in; no overlap |
| (this) | — | Report + backlog rows S-22…S-39 |

## Exit criteria

| Criterion | Evidence | Met? |
|---|---|---|
| Every critical/high fixed with migration + rollback + test | Critical: S-01, S-02, S-03, S-04. High: S-05…S-08, S-12, S-14…S-16, S-18. Each has a migration + paired rollback (DB) or code + unit test / probe (app). Mediums and one low bundled because they sat in the same statements or files: S-09, S-10, S-11 (low), S-13, S-17, S-19, S-21. | Yes |
| Each confirmed exploit refused by a test | Tests: SEC-3 chain → `consultationPatch.test.ts`; SEC-4 → `s1_02`; SEC-5 → `s1_03`; SEC-6 → `s1_04`–`s1_08`; anonymous consultation-media listing → `s1_09`. **Control run:** each file *fails* against today's production structure (e.g. "customer makes self admin … it was allowed") and passes after the S files. | Yes (PGlite) |
| CI green | Local: typecheck 0 errors · lint 0 errors (12 warnings, same as `main`) · build OK · unit tests 10/10 · `npm audit --audit-level=high` 0. GitHub CI: see the PR checks | Local yes; PR CI after push |
| Security Advisor 0 errors and no SECURITY DEFINER function executable by `anon` | Migration 2 verification query (definer functions executable by anon → expect **0**) passes in PGlite. `validate_invite_code` is also server-only (approved Q3). The CTO applied files 1–6 to production on 2026-09-27 and verified them with the files' queries and role tests: Security Advisor went from 25 to 13 WARN (`furrie-launch/approvals/S-review.md`). | Yes (production) |
| Report written | This file + `furrie-launch/reports/S.md` | Yes |

### SQL evidence (PGlite, production structure of 2026-09-27)

Harness in the S session's scratch folder, not in the repo. It loads production's catalogue as read through the read-only connection: 32 tables, 27 functions, 18 triggers, 103 policies, all grants, the 3 buckets, no rows. Results (80 harness checks, all passed):

0. Control: all 9 test files **fail** on unpatched production structure.
1. S files 1–6 applied, then applied again (idempotent).
2. Every verification query in the files matched its expected count.
3. 9/9 test files pass: **136 checks**. Each file shows the allowed and the refused case as anon, customer, vet, admin and service_role.
4. Rollbacks 6→1 applied twice: catalogue identical to production's.
5. Re-applied after rollback: identical to the first application; 9/9 pass again.
6. Edge cases: files 1–5 only → the pinned credit-request policy holds; file 6 refuses to run without L1's SQL.

Summary of the catalogue change: 249 facts removed and 27 added (mostly anon table grants removed).

### App probes (local `next start`, CI placeholder env)

| Request | Result |
|---|---|
| `PATCH /api/consultations/<id>` signed out / forged bearer | 401 / 401 |
| `POST /api/admin/bootstrap/reset-password` | 404 |
| `POST …/join`, `…/soap-notes`, `…/extend`, `/api/follow-up/thread`, `GET /api/profile`, `PATCH /api/admin/submissions/x`, `POST /api/email/welcome` (signed out) | 401 each |
| `GET /auth/callback?next=/%5Cevil.com` signed out, no code | 307 to the route's own "link is incomplete" login message (middleware lets it through) |
| `GET /dashboard`, `/admin-portal/dashboard` signed out | 307 `/login?redirectTo=…` |

Unit tests: the redirect check refuses `//evil.com`, `/\evil.com`, `/<TAB>/evil.com`, `/<LF>/…`, the dot-segment forms (`/.//evil.com`, `/..//evil.com/x`, `/%2e%2e//evil.com`, `/%2e//evil.com`, `/././/evil.com`), absolute URLs and `javascript:`. It keeps `/set-password` and same-site paths with query and hash, and a separate test asserts that for every input the final redirect resolves to our own origin. A brute-force run (scratch script, not in the repo) of 612,612 combinations found **0** that leave the site. The combinations mixed slashes, dots, `%2e`/`%2f`/`%5c`/`%09`, backslash, tab, `@`, `:`, `?`, `#` and scheme prefixes. The PATCH parser accepts exactly the 3 shapes the apps send, and refuses 13 smuggled fields, other statuses and outcomes, valid shapes with extra keys, and malformed values.

Deactivation, the fail-closed middleware and the admin guard need a real database session. They are in the production click-through below.

### Query cost of `is_active` (approval item 6)

- **No extra query:** page requests (middleware reads `is_active` in its role query) and admin API calls (`verifyAdmin`, same). The handlers in 12 of my route files now use the profile `getRequestUser()` loaded instead of reading it again (`profile` GET, flag POST, care-plans POST (role and the vet's name), generate-pdf, submissions GET/POST, treatment-plans GET/POST/PATCH/preview/finalize, join, email/welcome, follow-up/thread POST (the vet's name)).
- **One extra primary-key read per request:** the other 24 route files using `getRequestUser()`, plus care-plans GET, flag PATCH, profile PATCH and follow-up/thread GET.
- **Two reads until the owners switch to `profile`:** 6 of V's routes (`vet/*`) and 3 of L1's (`book`, `consultation-requests`, `…/claim`). Filed as backlog S-38.
- **Admin pages:** +1 read (layout guard). `getCurrentUser()` is unchanged (middleware already covers pages).

## SQL files — run order (CTO, `apply_migration`, name = file name without `.sql`)

1. `20260927100000_s1_helpers_baseline`
2. `20260927100100_s1_anon_and_functions`
3. `20260927100200_s1_profiles_role`
4. `20260927100300_s1_write_rules`
5. `20260927100400_s1_storage`. If it prints a WARNING about the bucket, the CTO does: Storage → consultation-media → Edit bucket → Public bucket off → Save.
6. `20260927100500_s1_credit_requests_after_l1`

**Applied to production and verified by the CTO on 2026-09-27.** All are safe **before** this PR merges. Run each file's verification queries after it. After the first real sign-up following file 2: `SELECT count(*) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)` → expect 0. Optional: paste any `supabase/tests/security/s1_*.sql` into the SQL Editor. Each one runs in a single statement and undoes itself; expected result `ERROR: S1 TEST PASSED …`. Rollbacks: `supabase/rollbacks/` (same names, reverse order; each re-opens its hole).

## Gerard's steps (the CTO relays)

1. **Now:** OK each SQL file for the CTO (above).
2. **Now: Vercel Secrets.** Vercel → project **furrie** → **Settings** → **Environment Variables**. For each of these that exists: `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `DAILY_API_KEY`, `CRON_SECRET`, `UPLOADTHING_TOKEN`, `SENTRY_AUTH_TOKEN`, `EXPO_ACCESS_TOKEN`:
   - click **⋯ → Edit**. If the type can be changed there, choose **Secret** and **Save**.
   - Otherwise: reveal and copy the value into Notepad (don't save it) → **⋯ → Remove** → **Add New**, same name, paste, tick **Production** and **Preview**, type **Secret** → **Save** → clear Notepad.

   Leave `DAILY_WEBHOOK_SECRET` to V and every `NEXT_PUBLIC_…` as Config. Then **Deployments** → top Production row → **⋯ → Redeploy**.
3. **Now: Supabase Auth checks** (report what you see; change nothing yet):
   - **Authentication → Emails → SMTP Settings:** is custom SMTP (Resend) on? Built-in email is limited to a few per hour for the whole project.
   - **Authentication → Rate Limits:** the email and OTP-verification numbers.
   - **Authentication → URL Configuration:** Site URL and the Redirect URLs list. Send the list to the CTO; remove nothing until it agrees.
   - **Sign In / Providers → Email:** OTP expiry and length.
   - **Attack Protection:** is leaked-password protection available and on?
   - **Project Settings → API Keys:** publishable key in use? Legacy anon key still enabled?
4. **After this PR merges:** Vercel → Environment Variables → `ADMIN_BOOTSTRAP_SECRET` → **⋯ → Remove** → Redeploy.
5. **After this PR merges: production click-through** (writes real rows; use test accounts):

   | # | Who | Do | Expect |
   |---|---|---|---|
   | 1 | new test email | Sign up at app.furrie.in with the code | Dashboard loads |
   | 2 | Customer A | Profile → change name and phone → Save | Saved; reload shows it |
   | 3 | Customer A | Book a slot (needs the vet's hours) | Confirmed; credits −1 |
   | 4 | Customer A | Open it → Edit concern → Save | Saved |
   | 5 | Customer A | Cancel it (more than 5 min before start) | Cancelled; **credit count back up by 1** |
   | 6 | Customer A | Book again for steps 7–10 | Confirmed |
   | 7 | Vet | Toggle Available off/on; edit weekly hours → Save | No error toast |
   | 8 | Vet + A | Join at the time → vet extends once → vet completes (SOAP "Complete") | Call works; extend works; status closed |
   | 9 | Vet / A | Follow-up chat: a message each way | Both arrive |
   | 10 | Vet | Flag the consultation, then withdraw the flag | Both succeed |
   | 11 | Admin | admin.furrie.in: dashboard, Users, Vets, Consultations, Credit requests | All load with data |
   | 12 | Admin + B | Deactivate test customer B; in B's open tab click any page | B lands on login ("account_disabled") and can't get back in; reactivate → B can sign in |
   | 13 | Vet (after V-1) | vet.furrie.in login → "Forgot password" while signed out | Recovery email; link opens the set-password page |

## Deviations from the approved plan

- **Test pattern:** each test file is one `DO` statement that ends with a deliberate error, instead of a `BEGIN … ROLLBACK` script. The effect is the same (everything is undone), but no transaction can be left open on the SQL Editor's pooled connection, and the result line is always visible. The files use their own synthetic test accounts created inside the statement, so no real account ids have to be looked up.
- **Migration 1** creates the helpers only where missing (the plan said `CREATE OR REPLACE`). That way re-running it can never undo migration 2's hardening.
- **Migration 4** pins the credit-request policy with `ALTER POLICY` only if the policy still exists. That way re-running it after migration 6 can't bring the policy back.
- **`getCurrentUser()` unchanged** (the plan listed it). Middleware already enforces `is_active` for pages at no cost; changing it would add a second read to vet pages (approval item 6).
- **More route files touched than planned:** 11 routes now use the profile `getRequestUser()` loaded, and `email/welcome` moved to `getRequestUser()`. Both were required by approval item 6.
- **Approval item 5 (L1's admin routes → `verifyAdmin()`):** already done by L1 in #53 (`consultation-requests/route.ts:62,128`, `consultation-packs/route.ts:28`). Nothing to change.
- **Middleware:** `/auth/callback` is explicitly public (approval item 3). The optional `vet.`-host recovery fallback to `/set-password` was added, then removed at the CTO review, so S-1 and V-1 stay independent of merge order. V passes `next=/set-password` explicitly.
- **Seam 2:** the credit-back call is live, not a TODO (L1 merged first).

## CTO review fixes (2026-09-27, `furrie-launch/approvals/S-review.md`)

| # | Finding | Fix |
|---|---|---|
| 1 | HIGH: `safeNextPath` returned the parsed path after dot-segment resolution, so `/.//evil.com` and similar became `//evil.com` (a regression versus main) | Refuse a parsed path starting with `//`, and re-check that the exact returned string resolves to our origin. Five payloads and an every-case origin assertion added to the tests. Brute force: 612,612 inputs, 0 leaks |
| 2 | MEDIUM: recovery fallback to `/set-password` would 404 if S-1 merged before V-1 | Removed; the default stays `/dashboard` |
| 3 | LOW: the login forms showed `account_disabled` / `no_profile` as raw codes; the admin guard used `wrong_account` for every case | `src/lib/auth/loginErrors.ts` holds the two messages. `AuthForm.tsx` (ownership exception, mapping only) and `AdminLoginForm.tsx` use them, and V can import the same map in `VetLoginForm`. Admin guard: no profile → `no_profile`, deactivated → `account_disabled`, wrong role → `wrong_account`, database error → the portal's "Try again" error page |
| 4 | LOW: the report overstated deactivation | Wording fixed in "In plain English"; S-30 and S-35 stay in the backlog |
| 5 | LOW (optional): two caller-name reads | Folded into the loaded profile (`care-plans` POST, `follow-up/thread` POST) |

## For other sprints

- **V:**
  - `VetLoginForm`: show `ACCOUNT_ERROR_MESSAGES` from `src/lib/auth/loginErrors.ts` for `account_disabled` / `no_profile` (the CTO asked V).
  - Switch the six `vet/*` routes to `getRequestUser().profile` (S-38).
  - Vaccination approve/reject write 0 rows today; use a service-role write after a vet↔pet check (S-23).
  - `vet-portal/(app)/consultations/page.tsx:92-94` puts an unescaped `searchQuery` into `.or()`.
  - `admin/password` A-12.
  - Ban/unban in `admin/vets` PATCH (S-35).
  - The join route can use `roomNameForConsultation()` once both branches are merged (S-39).
  - After V-1's completion route, S-2 narrows the consultation trigger (S-36).
- **L1:** `book`, `consultation-requests`, `…/claim` can use `getRequestUser().profile` instead of re-reading the caller's profile (S-38).
- **Mobile (parked):** `consultation-media` needs signed URLs when revived (S-37).
- **S-2:** backlog S-22…S-39.

## Test accounts and rows created

None in production. The SQL tests ran in an in-memory PGlite database. The test files, if run in the SQL Editor, create and then undo their own synthetic accounts (`s1-test-…@example.invalid`).
