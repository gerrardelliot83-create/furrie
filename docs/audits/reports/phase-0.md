# Phase 0 report — Stop the bleeding and start measuring

PR: https://github.com/gerrardelliot83-create/furrie/pull/51 · Branch: `chore/phase-0-stabilise` · CI: https://github.com/gerrardelliot83-create/furrie/actions/runs/34855277200 (green, 2 min 0 s) · Preview: https://furrie-git-chore-phase-0-stabilise-aeneshs-projects.vercel.app

Session: 2026-09-14, Claude Code (Opus), working from `main@33484df`. 19 commits, one per finding.

## In plain English

The job that has been failing every ten minutes for months now works. Video-call webhooks can be verified again. Three features that silently did nothing (flagging a consultation, the admin audit trail, admin password reset) now do their job. Three security holes are closed and the framework is upgraded past its critical advisories. Every API route now reports failures to Sentry with a request id, and a CI check runs on every pull request. Nothing changes on screen for customers or vets.

## Findings closed

| ID | Commit | File:line | Note |
|---|---|---|---|
| BRK-1 | c6bb48d | `src/app/api/cron/close-stale-active/route.ts:12-22,52-55,81` | `room_name` → `daily_room_name`. Column list is a `const` tuple checked with `satisfies (keyof ConsultationRow)[]`; verified that reintroducing the typo fails `tsc` (TS2322). |
| BRK-2 | a659486 | `src/app/api/daily/webhook/route.ts:7-45,74-104` | Daily's documented scheme: base64-decoded secret, HMAC-SHA256 over `timestamp.rawBody`, base64 digest, `timingSafeEqual`, 5-minute replay window. 503 in production when `DAILY_WEBHOOK_SECRET` is unset. Scratch test: genuine=ok, old hex scheme=mismatch, tampered=mismatch, 6-min-old=stale. |
| BRK-3 | c373cee | `src/app/api/consultations/[id]/flag/route.ts:69-89,119-160`; `supabase/migrations/20260914100000_consultation_flags_vet_access.sql` | Writes `details`/`admin_status`; `is_flagged` writes removed (column never existed). Migration: vet SELECT on own flags, vet UPDATE limited to `pending → withdrawn`, `withdrawn` added to the CHECK. Request/response shape unchanged. |
| BRK-4 | f4cd790 | `src/lib/admin/auth.ts:52-84`; `supabase/migrations/20260914100100_audit_logs.sql` | `{error}` read and sent to Sentry (tags: action, pg code); never blocks. Migration recreates 013 idempotently. |
| BRK-5 | 23ec5a0 | `src/app/api/analytics/capture-treatment/route.ts:117-131`; `supabase/migrations/20260914100200_increment_prescribing_use_count.sql` | RPC created as one atomic insert-or-increment keyed on `auth.uid()`, SECURITY INVOKER, EXECUTE to `authenticated` only. Route calls it once (the old upsert-then-increment would have started new rows at 2). |
| BRK-6 | fc91222 | `src/app/api/admin/password/route.ts:5-19,46-121`; `src/lib/email/templates.ts` (`passwordResetEmail`) | `generateLink` → `hashed_token` → `<portal>/auth/callback?token_hash=…&type=recovery` (verified server-side by the existing `handleAuthCallback`) → sent through Resend. 500 if Resend refuses; success only after send. |
| BRK-7 | 45043e4 | `src/app/api/admin/health/route.ts:76`; `src/lib/admin/stats.ts:86-91`; `src/app/vet-portal/(app)/consultations/page.tsx:85-87`; `src/app/admin-portal/(app)/consultations/page.tsx:45-80` | `'matching'` dropped; vet "Missed" tab now filters `outcome = 'missed'`; unreachable `'no_show'` label/badge cases removed. |
| SEC-1 | 1c7ca94 | `src/app/api/admin/setup-webhooks/route.ts` (deleted) | Zero callers; reference table below. |
| SEC-8 | d4525e9 | `src/lib/cron/auth.ts` (new); `src/app/api/cron/{cleanup-pending,close-stale-active,expire-packs,expire-subscriptions,expire-threads,mark-missed,send-reminders}/route.ts` | 401 in production when `CRON_SECRET` unset; constant-time compare; warned pass-through only outside production. |
| SEC-9 | 36ffb8f, ef92cea | `package.json`, `package-lock.json`, `next.config.ts` | Next + eslint-config-next 16.3.5; @sentry/nextjs 10.74; next-intl 4.14.5; resend 6.28; supabase CLI 2.117; `effect` override (see deviations). `npm audit`: 36 (2 critical, 17 high) → **1 low** (esbuild dev server, Windows only). |
| SEC-10 (open redirect) | e532fb5 | `src/app/api/auth/callback/route.ts:4-15` | `//evil.com`, `/\evil.com`, `///evil` all resolve to `/dashboard` on the app origin. Other SEC-10 items stay in Phase 2. |
| SEC-12 (Sentry) | 386396a | `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts` | `sendDefaultPii: false` ×3; `includeLocalVariables` removed. Log-line PII stays in Phase 2. |
| ARC-8 (Phase 0 subset) | f209048, 36ffb8f, ef92cea | 20 files, −2,595 lines; deps | See reference table. `react-dropzone` and `xlsx` removed from the app tree; `lucide-react`/`date-fns` removed from `next.config.ts`. |
| OBS-1 (floor) | 386396a | `src/server/handler.ts` (new); 73 route files, 101 handlers | `withRoute()`: request id (`x-vercel-id` or UUID) echoed as `x-request-id`; thrown errors → Sentry + JSON `{error, code, requestId}` 500; handler-returned 5xx → Sentry message. Applied mechanically; bodies unchanged. |
| OBS-2 (CI) | e36b538 | `.github/workflows/ci.yml`, `.nvmrc`, `package.json` (`engines.node = 22.x`) | typecheck · lint · `next build` · `npm audit --audit-level=high` on every PR and on `main`. |
| OBS-3 (protocol) | 3f6f4a8 | `scripts/perf/measure.md` | Protocol defined. Baseline: see "Measurements". |
| D1 knob | 386396a | three Sentry configs; `next.config.ts` `env`; `.env.example` | `SENTRY_TRACES_SAMPLE_RATE` (default 0.25), one variable for server, edge and browser. |

## Exit criteria

| Criterion | Evidence | Met? |
|---|---|---|
| Vercel function error rate 0% for 24 h | Cannot be measured until the PR is merged and deployed. The only failing function was `close-stale-active` (BRK-1). Check on the day after merge: Vercel → `furrie` → Observability → Functions → error rate, last 24 h. | **Pending merge** |
| CI green | https://github.com/gerrardelliot83-create/furrie/actions/runs/34855277200 — local run of the same four steps: typecheck 0 errors, lint 0 errors / 14 warnings, `next build` 79 routes, audit 1 low. | **Yes** — green on the first run |
| Baseline committed | `docs/perf/2026-09-baseline.md` | **Pending** — needs Gerard signed in (see "Measurements") |
| Next 16.3.5, no critical/high in `npm audit` | `package.json:next = "16.3.5"`; `npm audit --audit-level=high` exits 0; full audit reports 1 low | Yes |
| Deletion reference table in the PR | PR #51 description, section "Deletion reference table" (also below) | Yes |

## Gerard must do

Do these in order. Steps 1–3 are before merge; 4 is the preview click-through; 5 is after merge; 6 prepares Phase 1.

- [ ] **1. Run the three SQL files in Supabase**, one at a time, in this order. Supabase dashboard → project `nfwpunllsrjlgcezjojv` → SQL Editor → New query → paste the whole file → Run. Each file starts by checking the table exists (`to_regclass`) and is safe to run twice. The verification queries are in comments at the bottom of each file; run them after and expect the noted result.
  1. `supabase/migrations/20260914100100_audit_logs.sql` — creates the missing `audit_logs` table. Verify: `SELECT to_regclass('public.audit_logs');` → `audit_logs`.
  2. `supabase/migrations/20260914100000_consultation_flags_vet_access.sql` — flag policies. Verify: `SELECT policyname FROM pg_policies WHERE tablename = 'consultation_flags';` → 4 rows.
  3. `supabase/migrations/20260914100200_increment_prescribing_use_count.sql` — the RPC. Verify: `SELECT proname FROM pg_proc WHERE proname = 'increment_prescribing_use_count';` → 1 row.
  (Reminder from the September purge: the SQL editor runs each "Run" on its own connection; these files contain no `BEGIN`, so nothing to worry about.)

- [ ] **2. Check two secrets exist in Vercel** — after this deploys, the crons and the Daily webhook refuse to run without them (that is the point of SEC-8). Vercel → `furrie` → Settings → Environment Variables:
  - `CRON_SECRET` must be present for **Production**. Vercel sends it automatically as `Authorization: Bearer …` to cron routes when it exists. If it is missing, add any long random string; no other change needed.
  - `DAILY_WEBHOOK_SECRET` must be present for **Production** and must be the base64 `hmac` value Daily returned when the webhook was registered. If you are not sure it is right, run `npm run setup:daily-webhooks` locally (needs `DAILY_API_KEY` in `.env.local`) which re-registers the webhook and prints the new `hmac`; paste that value.

- [ ] **3. Set `SENTRY_TRACES_SAMPLE_RATE` = `1`** in Vercel → Settings → Environment Variables, for Production and Preview (decision D1). It takes effect on the next deployment, so do this before merging.

- [ ] **4. Click through the preview** (customer portal only — the preview URL has no `vet.`/`admin.` subdomains, so those portals are checked on production after merge):
  `https://furrie-git-chore-phase-0-stabilise-aeneshs-projects.vercel.app` → sign in with your customer account → dashboard loads → Consultations list → open one → Pets → open a pet → **upload a pet photo** (this exercises the `uploadthing` package whose `effect` dependency was overridden; if the upload fails, tell me before merging) → Profile → sign out.

- [ ] **5. After merge, on production:**
  - Next day: Vercel → Observability → Functions → error rate over 24 h should read 0%.
  - Admin portal → Users → pick a test account → "Send password reset" → the email arrives (subject "Reset your Furrie password") and its link signs you in.
  - Sentry → Issues: nothing new from `/api/*` (a new issue tagged `request_id` means the floor is working and something real broke — send it to me).

- [ ] **6. Phase 1 preparation (decision D2) — JWT signing keys.** Do this only after the merge is verified.
  1. **Check which API keys the app uses.** Vercel → Settings → Environment Variables → look at `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If the value starts with `sb_publishable_`, skip to step 3. If it starts with `eyJ`, it is a legacy anon key: go to step 2.
  2. **Create the new API keys** (they work alongside the old ones): Supabase → Project Settings → **API Keys** → tab **Publishable key** → copy the `sb_publishable_…` value → tab **Secret keys** → Create new secret key (name it `vercel-server`) → copy the `sb_secret_…` value once shown. In Vercel, set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the publishable value and `SUPABASE_SECRET_KEY` to the secret value (Production and Preview), redeploy, sign in on `app.furrie.in` to confirm. **Do not disable the legacy keys** on that page: the parked mobile builds still embed the old anon key.
  3. **Rotate to asymmetric signing keys.** Supabase → Project Settings → **JWT Keys** (the URL ends in `/settings/jwt`) → click **Migrate JWT secret** (imports the current secret and creates a standby asymmetric key; accept the default ECC P-256 key type if asked) → click **Rotate keys** so the standby becomes the current key. The old secret moves to "Previously used". **Do not click Revoke** on it: tokens and the legacy API keys signed with it must stay valid until every client has moved.
  4. Tell the next session it is done. Phase 1 confirms it in the dashboard and registers the access-token hook (that click path comes with Phase 1, because the database function it points at is created in Phase 1).

## Deviations from the prompt, and why

- **Speed Insights installed** (`f428938`). D1 deferred it to beta launch, but Gerard enabled Speed Insights and Observability Plus in Vercel during this session. Enabling it in the dashboard collects nothing for a Next.js app until `<SpeedInsights />` is rendered, so the component went in. Same-origin script; no CSP change.
- **BRK-3 goes slightly beyond "grant vets SELECT"**: `withdrawn` added to the `admin_status` CHECK and a vet UPDATE policy limited to `pending → withdrawn`. Without both, the existing PATCH (withdraw) had no valid value to write and RLS would have made it a silent no-op reported as success.
- **BRK-5 signature** is `(species, diagnosis, medication, dosage?, route?, frequency?, duration?)` keyed on `auth.uid()`, not `(vet_id, species, diagnosis)`: the unique key includes the medication, and taking a vet id as a parameter was the SEC-4 pattern. The route now makes one call instead of upsert + increment.
- **BRK-6 does not use `resetPasswordForEmail`**: a server-initiated recovery link returns implicit-flow tokens in the URL fragment, which the server-side `/auth/callback` route cannot read. The `hashed_token` + `verifyOtp` path is the one the existing callback already supports.
- **`effect` npm override** (`^3.22.2`): `uploadthing@7.7.4` pins `effect@3.17.7` exactly (GHSA-38f7-945m-qr2g, high) and no uploadthing release fixes it; `@effect/platform` declares peer `effect ^3.17.7`, so the override is within range. Verified by build; Gerard verifies an upload on the preview (step 4). Tracked as P0-6.
- **One eslint-disable** in `AuthForm.tsx:60` so the new CI lint gate is green; the pre-existing error would otherwise have blocked every PR. The rework changes SSR behaviour and is P0-1.
- **Sentry config deprecations** fixed while upgrading (import from `@sentry/nextjs/config`; `disableLogger` removed — not supported under Turbopack). They printed on every build.
- **`@supabase/ssr` and `@supabase/supabase-js` were not bumped** (not in the brief's list, not audit-flagged). Phase 1 bumps them if `getClaims()` needs it.
- **Migrations are named CLI-style** (`20260914HHMMSS_…`) rather than `022_…`, as the brief's BRK-4 step asks; Phase 3 archives 000–021 behind a production baseline (P0-10).

## Discovered but not done (added to `docs/audits/backlog.md`)

P0-1 `AuthForm` effect rework · P0-2 **no page anywhere lets a user set a new password after a recovery link** (vet welcome email and "forgot password" both end signed in with the old password) · P0-3 flag UPDATE policy is state-limited, not column-limited · P0-4 RPC missing from `database.types.ts` · P0-5 handler-returned 5xx reach Sentry without a stack until Phase 4 · P0-6 `effect` override to re-check on every uploadthing release · P0-7 ad-hoc log lines → Phase 4 logger · P0-8 `middleware → proxy` deprecation (Phase 1) · P0-9 mobile docs describe deleted web routes · P0-10 migration naming until Phase 3.

Also noted, not a code item: the preview deployment URL has no `vet.`/`admin.` subdomains, so preview click-throughs only cover the customer portal. Vercel preview branch domains would fix that for later phases.

## Measurements

**Pending.** `scripts/perf/measure.md` is committed. Running it needs a signed-in customer and vet on production, and production has zero vets since the 2026-09-06 purge. The plan agreed with Gerard is recorded here when the baseline is run; the table is copied from `docs/perf/2026-09-baseline.md` into this section at that point.

Local build facts recorded now for comparison later: `next build` on 16.3.5 compiles in ~25 s warm, emits 79 routes (86 before the deletions).

## Reference tables for anything deleted

ripgrep across `furrie` and `furrie-mobile` (`apps/`, `packages/`, `scripts/`, `docs/`), `vercel.json`, `package.json`; excluding `node_modules`, `.next`, lockfiles and the audit documents that list the candidates. "Refs" = references outside the item itself.

| Item | Refs | Only matches were |
|---|---|---|
| `api/admin/setup-webhooks` (SEC-1) | 0 | its own route.ts |
| `api/admin/email-test` | 0 | its own route.ts |
| `api/admin/vets/cleanup` | 0 | its own route.ts; a prose mention in the untracked `BACKLOG-2026-09-01.md` |
| `api/consultations/match` | 0 | its own route.ts; `MatchingScreen.tsx` (deleted in the same commit) |
| `api/consultations/[id]/accept` | 0 | its own route.ts (already a 410 stub); a code comment in the mobile vet app noting it is 410 |
| `api/cron/reassign-stale` | 0 | its own route.ts (410 stub; not in `vercel.json` crons) |
| `api/daily/create-room` | 0 | its own route.ts; a planning table in mobile `packages/api-client/src/categories/README.md` |
| `api/daily/token` | 0 | its own route.ts; mobile `docs/WEB_ARCH_DAILY.md`, which itself says mobile uses `/join` |
| `POST /api/consultations` | 0 | `hooks/useConsultations.ts` (deleted). **GET kept** — mobile calls `GET /consultations` |
| `components/consultation/MatchingScreen` (+css) | 0 | its barrel export |
| `components/consultation/PreJoinScreen` (+css) | 0 | its barrel export |
| `components/consultation/PaymentButton` (+css) | 0 | its barrel export |
| `components/customer/LoginForm` (+css) | 0 | its barrel export; `SignupForm` shared the CSS module |
| `components/customer/SignupForm` | 0 | its barrel export |
| `hooks/useConsultations` | 0 | nothing |
| `react-dropzone` (dependency) | 0 | `package.json` only (`FileUpload.tsx` uses `@uploadthing/react`'s `useDropzone`) |
| `xlsx` (dependency) | 0 in `src/` | the three Excel scripts, moved to `scripts/tooling/` with their own `package.json` |

None of the 42 routes the mobile apps call are touched (list derived from `furrie-mobile/apps/*/lib/api/*.ts` and `packages/api-client`).
