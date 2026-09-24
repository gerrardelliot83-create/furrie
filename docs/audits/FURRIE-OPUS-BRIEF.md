# Furrie platform remediation — brief for the Opus agent

Companion to `2026-09-14-platform-audit.md` (the audit report, same folder). Both files live at `docs/audits/` in the `furrie` repo. Start each phase in a fresh Claude Code session running Opus, paste the operating rules and the phase prompt, and end the session with the phase report described below. One phase per session. Decisions D1 to D10 are locked (see the end of this file); do not re-ask them.

## Operating rules (paste at the top of every session)

- Read `docs/audits/2026-09-14-platform-audit.md` before touching anything. Finding IDs (BRK-, SEC-, DB-, ARC-, FE-, OBS-) refer to its ledger.
- One branch and one PR per phase. The PR description lists every finding ID it closes and the file:line it touched. CI must be green. Never skip hooks or signing.
- Never run DDL against production. Produce migration files plus a short "run this" note for Gerard; check `to_regclass()` first because production does not match the migrations folder.
- Measure before and after with the same protocol (Phase 0 defines it) and commit the numbers to `docs/perf/`.
- Do not widen scope. Log anything discovered but out of phase to `docs/audits/backlog.md` with a finding ID.
- The 42 API routes the mobile apps call keep their request and response shapes. Change internals freely; change contracts only with a version.
- Deletions need proof: before removing any route, component, hook, dependency or feature, produce a reference table (grep across `furrie` and `furrie-mobile`, `vercel.json` crons, the 42-route mobile list) and put it in the PR. Delete only what has zero references. The build failing on a missing import is not a substitute for the table.
- Delete, do not comment out, once the table proves it is dead.
- Gerard is non-technical: every PR description opens with three plain-English sentences on what changed for users and what he must do (dashboard steps, SQL to run). Every PR gets a Vercel preview deployment that Gerard clicks through before merge.
- Ask Gerard only about things this brief does not settle; otherwise take the documented default and say so in the PR.
- End the session by writing the phase report (template below) to `docs/audits/reports/phase-N.md` and committing it to the branch. Gerard forwards it to the reviewing session, which verifies the branch directly before the next phase starts. Do not start the next phase.

## Phase report template

```
# Phase N report — <name>
PR: <url> · Branch: <name> · CI: <link> (green/red) · Preview: <url>

## Findings closed
| ID | Commit | File:line | Note |

## Exit criteria
| Criterion | Evidence (number, link, path to screenshot or log) | Met? |

## Gerard must do
- [ ] each dashboard step with its exact click path, or the SQL file path and what it changes

## Deviations from the prompt, and why

## Discovered but not done (added to docs/audits/backlog.md with IDs)

## Measurements
Before/after table copied from docs/perf/ (Phase 0 onward).

## Reference tables for anything deleted
```

## Phase order and dependencies

| Phase | Name | Depends on | Gerard must do first |
|---|---|---|---|
| 0 | Stop the bleeding and start measuring | nothing | place both audit files in `docs/audits/`; set `SENTRY_TRACES_SAMPLE_RATE=1` in Vercel after the PR merges |
| 1 | One auth spine | 0 | D2: JWT signing keys + register the access-token hook (click path comes in the Phase 0 report) |
| 2 | Close the security gaps | 1 | — |
| 3 | Make the repository the truth for the database | 2 | `supabase login` on the laptop |
| 4 | The server layer | 3 | — |
| 5 | Re-render the pages | 4 | — |
| 6 | Realtime without polling the log | 4 | reset pg_stat_statements after deploy |
| 7 | Quality floor, dormant-feature removal, hygiene | 4, 5 | click through the preview before merge |
| 8 | Shared contracts (when mobile resumes) | — | D9 timing |

## Finding IDs referenced by the prompts

Broken in production: BRK-1 close-stale-active `room_name` (cron 500 every run) · BRK-2 Daily webhook HMAC scheme · BRK-3 flag route columns · BRK-4 audit_logs missing + error ignored · BRK-5 `increment_prescribing_use_count` missing · BRK-6 admin password reset no-op · BRK-7 dead status literals · BRK-8 vet dashboard timeout redirect loop · BRK-9 booking not transactional · BRK-10 stale index predicate.

Security: SEC-1 setup-webhooks unauthenticated · SEC-2 payments webhook open under SKIP flag · SEC-3 consultations PATCH mass assignment · SEC-4 consume_pack_credit callable by anyone · SEC-5 profiles UPDATE allows role escalation · SEC-6 over-broad user policies · SEC-7 anon-readable ratings and sachet codes · SEC-8 crons and webhooks fail open · SEC-9 Next.js 16.1.6 advisories · SEC-10 open redirect, participant checks, plaintext passwords, unpaginated listUsers · SEC-11 service role in 37 routes · SEC-12 PII in Sentry and logs.

Data: DB-1 prod schema not in repo, no migration tracking · DB-2 RLS per-row cost (288 advisor warnings) · DB-3 postgres_changes = 68% of DB time · DB-4 untyped Database client · DB-5 number generators scan and race · DB-6 FK delete rules · DB-7 index bloat, invite trigger for all roles.

Architecture: ARC-1 no server layer · ARC-2 state machine unenforced · ARC-3 three data paths · ARC-4 no transactions · ARC-5 waterfalls and N+1 · ARC-6 UTC "today" and 17 formatters · ARC-7 ad hoc config and flags · ARC-8 dead routes, components, deps, files.

Frontend: FE-1 three identity round trips per request · FE-2 client refetch storm, bell mounted twice · FE-3 no streaming, wrong loading/error boundaries · FE-4 withTimeout silent empties · FE-5 server/client boundary mistakes · FE-6 duplication · FE-7 CSS and brand · FE-8 i18n half-done · FE-9 PWA basics.

Observability: OBS-1 no Sentry in API, errors to 2xx · OBS-2 no tests, no CI · OBS-3 no measurement.

---

## Phase 0 — Stop the bleeding and start measuring

```
You are working in C:\Users\Aenesh\Desktop\furrie (Next.js 16 / Supabase, deployed on Vercel bom1). Read docs/audits/2026-09-14-platform-audit.md and docs/audits/FURRIE-OPUS-BRIEF.md first; this session is Phase 0. The operating rules in the brief apply. Create branch chore/phase-0-stabilise. Do not refactor anything in this phase.

0. Docs: remove `/docs/` and `CLAUDE.md` from .gitignore. Gerard has placed the two audit files in docs/audits/; commit them in the first commit so every later session can read them.
1. Toolchain: npm install; add "engines": {"node": "22.x"} and an .nvmrc; add .github/workflows/ci.yml running typecheck, lint, next build and `npm audit --audit-level=high` on every PR.
2. Dependencies: upgrade next and eslint-config-next to 16.3.5 (read the 16.2/16.3 release notes for breaking changes; the app uses middleware.ts, rewrites, next-intl, Sentry); update @sentry/nextjs, next-intl, resend, uploadthing/@uploadthing/react and the supabase CLI to the audit-clean versions; remove react-dropzone, lucide-react, xlsx and date-fns references (next.config.ts optimizePackageImports). Move the three breed-conversion scripts under scripts/tooling with their own package.json so xlsx leaves the main tree.
3. Fix verified production breakages, each in its own commit with the finding ID in the message:
   BRK-1 src/app/api/cron/close-stale-active/route.ts:34 room_name -> daily_room_name; add a typed select so this cannot recur.
   BRK-2 src/app/api/daily/webhook/route.ts: implement Daily's documented scheme (Buffer.from(secret,'base64'), HMAC-SHA256 over `${timestamp}.${rawBody}`, base64 digest, crypto.timingSafeEqual, reject timestamps older than 5 min); return 503 when DAILY_WEBHOOK_SECRET is unset in production instead of trusting the event.
   BRK-3 flag route: write `details` and `admin_status` (values pending/investigating/resolved), drop is_flagged; add a migration granting vets SELECT on their own consultation_flags.
   BRK-4 src/lib/admin/auth.ts: read the {error} from the insert and report it to Sentry; write supabase/migrations/<timestamp>_audit_logs.sql that recreates 013 idempotently, and a note for Gerard to run it.
   BRK-5 either add increment_prescribing_use_count(vet_id, species, diagnosis) as a migration or delete the call; prefer the migration.
   BRK-6 admin/password: use auth.resetPasswordForEmail or send the generated link through Resend; never report success without sending.
   BRK-7 replace 'matching' and 'no_show' literals with the real values.
4. Security quick wins: delete src/app/api/admin/setup-webhooks entirely (SEC-1); make all seven crons return 401 when CRON_SECRET is unset in production (SEC-8); fix the open redirect in src/app/api/auth/callback (reject paths starting with //).
5. Dead code, with proof (decision D6): build the reference table first, then delete only items with zero references in web and furrie-mobile. Candidates: admin/email-test, admin/vets/cleanup, consultations/match, consultations/[id]/accept, cron/reassign-stale, daily/create-room, daily/token, POST /api/consultations (keep GET), components MatchingScreen, PreJoinScreen, PaymentButton, SignupForm, LoginForm, hook useConsultations. Do NOT touch the pricing engine, sachets, subscriptions UI or any other feature code; those wait for Phase 7 when tests exist.
6. Observability floor: add a `withRoute()` wrapper in src/server/handler.ts that catches, assigns a request id, calls Sentry.captureException, and returns {error, code}; wrap every route (mechanical change, no logic changes). Set sendDefaultPii false in all three Sentry configs. Make tracesSampleRate read SENTRY_TRACES_SAMPLE_RATE (default 0.25) in all three configs; Gerard sets it to 1 in Vercel for the duration of this work (decision D1). Do not install Speed Insights or Observability Plus; those come at beta launch.
7. Measurement protocol: write scripts/perf/measure.md describing how to log in as a test customer and a test vet in the Browser pane, hard-reload each of six pages (customer dashboard, consultations list, consultation detail, vet dashboard, vet patient detail, login-to-dashboard transition) three times, and record TTFB, DOMContentLoaded and settled time from DevTools, Supabase request counts from the network panel, and the matching Sentry transaction durations. Run it with Gerard's help and commit docs/perf/2026-09-baseline.md.
8. Write the Phase 1 dashboard click path for Gerard (JWT signing keys: Settings -> JWT Keys -> create standby -> rotate; confirm first that the project uses sb_publishable_/sb_secret_ API keys so rotation cannot break them) and include it in the phase report.

Open one PR. In its description, list each finding ID and the commit that closes it, paste the baseline table and the deletion reference table. Write docs/audits/reports/phase-0.md.
```

Exit: Vercel function error rate 0% for 24 h · CI green · baseline committed · Next 16.3.5, no critical/high in `npm audit` · deletion reference table in the PR.

## Phase 1 — One auth spine

```
Phase 1 of docs/audits/2026-09-14-platform-audit.md. Branch feat/phase-1-auth-spine. Read src/middleware.ts, src/lib/supabase/*, src/lib/auth/withAuth.ts, src/lib/admin/auth.ts and the #50 commit message (git show 33484df) before starting; the reasoning there about stale app_metadata is correct and this phase solves it differently. Gerard has completed the JWT signing-key migration (D2); verify with the dashboard before relying on getClaims.

1. Migration: create public.custom_access_token_hook(event jsonb) returns jsonb, SECURITY DEFINER, SET search_path = '', that reads profiles.role for event->>'user_id' and sets claims.user_role; grant usage to supabase_auth_admin, revoke from public/anon/authenticated as the Supabase docs require. Write the dashboard step for Gerard (Authentication -> Hooks -> Customize Access Token). Add a note that role changes take effect on the next token refresh, and make the admin promote/deactivate actions call auth.admin.signOut(userId, 'global').
2. Rename src/middleware.ts to src/proxy.ts (Next 16). It must make no Supabase network call: use supabase.auth.getClaims() (verifies the JWT against the project's JWKS) and read user_role from the claims. Keep the cookie refresh behaviour from @supabase/ssr. Keep the subdomain and public-path logic; delete the profiles query and the app_metadata fallback.
3. Create src/server/context.ts exporting getRequestContext(): cached per request; accepts cookie or Bearer; returns { userId, role, supabase } where role comes from the claims; throws AppError('AUTH_REQUIRED') when absent. Add requireRole(...roles) and requireOwner(row, field) helpers, and authorizeConsultationParticipant(id) modelled on soap-notes/route.ts:31-83.
4. Replace getCurrentUser, getRequestUser, verifyAdmin and the four inline admin checks with the new context in every route and page (grep for auth.getUser, profiles.select('role'), .eq('role')). Delete the old helpers when nothing imports them.
5. RLS: migration that creates is_admin() and is_vet() as STABLE SECURITY DEFINER SET search_path = '' functions reading (select auth.jwt()->>'user_role'), replacing the production versions (dump them first with a note for Gerard, since they exist only in prod), and rewrites the 29 policies that currently EXISTS into profiles to call (select is_admin()) / (select is_vet()). Do not touch the other policies yet; that is Phase 3.
6. Add a dev-only counter (env-gated) that logs the number of Supabase auth and REST calls per request, and use it to prove the exit criterion. Re-run the Phase 0 measurement protocol and commit docs/perf/2026-09-phase-1.md with before/after.

Contract note: the 42 mobile routes keep accepting Authorization: Bearer tokens; getClaims works on them too. Write docs/audits/reports/phase-1.md.
```

Exit: one auth network call per server request (zero for locally verified tokens) · no route or page queries `profiles.role` · six pages re-measured.

## Phase 2 — Close the security gaps

```
Phase 2 of docs/audits/2026-09-14-platform-audit.md. Branch fix/phase-2-security. Small commits, one finding each. Write a negative test for every item (vitest against a local Supabase, or a documented manual check if local Supabase is not available on this machine). Payments stay dark (decision D4).

SEC-2 Payments: replace NEXT_PUBLIC_SKIP_PAYMENTS with a server-only PAYMENTS_MODE=off|cashfree. When off, /api/payments/webhook, /api/payments/create-order, /api/payments/status and /api/packs/purchase return 404. Remove the SKIP branches that scheduled consultations and minted packs. Keep the Cashfree scaffolding for the later integration.
SEC-3 consultations/[id] PATCH: define a zod schema per role (customer: concern fields and cancel; vet: clinical fields and status transitions through the state machine; admin: everything) and stop passing the raw body to the mapper. Use the user-scoped client; add the missing UPDATE policy rather than reaching for the service role.
SEC-4 Migration: REVOKE EXECUTE ON consume_pack_credit FROM public, anon, authenticated; GRANT to service_role; or better, drop p_customer_id and credit auth.uid() as redeem_invite_code does, then grant authenticated.
SEC-5 Migration: profiles UPDATE policy gets WITH CHECK (auth.uid() = id) and a BEFORE UPDATE trigger that raises if role, is_active or email change for a non-admin; alternatively REVOKE UPDATE (role) ON profiles FROM authenticated. Verify first with a test customer that the escalation currently works in production (PATCH /rest/v1/profiles with role=admin) and record the result.
SEC-6 Migrations: vet_profiles UPDATE restricted to editable columns (trigger); consultations vet UPDATE cannot change vet_id/customer_id/amount_paid; consultations INSERT WITH CHECK status='pending' AND is_free=false AND vet_id IS NULL; follow_up_threads customer UPDATE limited to is_active; care_plan_steps customer UPDATE limited to status/completed_at.
SEC-7 Migrations: consultation_ratings SELECT restricted to participants and admins (a public aggregate view if the vet profile needs ratings); sachet_codes SELECT removed for non-admins; add TO authenticated to every remaining policy.
SEC-10 email/consultation-completed participant check; invites/validate rate limited with the existing checkRateLimit; admin/vets stops emailing passwords (send an invite link); paginate every listUsers() call.
SEC-11 For each of the 37 routes importing supabase/admin, either justify in a one-line comment (cron, webhook, admin, notification broadcast) or switch to the context's user client. Target under 15.
SEC-12 sendDefaultPii false (done in Phase 0); remove emails and payload bodies from log lines; in furrie-mobile note the JWT-claims log for the mobile backlog but do not change that repo.

Open one PR with the checklist. Write docs/audits/reports/phase-2.md.
```

Exit: Security Advisor 0 errors · negative tests for each SEC item · service-role imports under 15.

## Phase 3 — Make the repository the truth for the database

```
Phase 3 of docs/audits/2026-09-14-platform-audit.md. Branch chore/phase-3-database-truth. Production does not match supabase/migrations (audit DB-1); never assume schema from the folder. Account deletion follows decision D3: anonymise the profile and remove the auth user; retain consultations, SOAP notes and prescriptions against the anonymised id; cascade pets, media, notifications, invites and packs.

1. Baseline: with the linked project (supabase/.temp/project-ref), run `supabase db dump --schema public -f supabase/migrations/<timestamp>_baseline.sql` (and `--data-only` for pricing_config only). Move 000-021 to supabase/migrations/_archive/pre-baseline/. Run `supabase migration repair` so the history table records the baseline as applied. Document the workflow in supabase/README.md: db diff -> migration file -> PR -> Gerard runs db push. Add a CI job that runs `supabase db diff --linked` and fails if non-empty.
2. Regenerate src/lib/database.types.ts from the linked project. Pass Database as the generic to createServerClient/createBrowserClient/createClient in all five factories. Fix every resulting type error; each one is a latent bug, so list them in the PR.
3. RLS performance migration: wrap every auth.uid() as (select auth.uid()); ensure is_admin()/is_vet() are STABLE with search_path set; merge multi-permissive SELECT policies into one per table where the rows are disjoint by construction (profiles, pets, vet_profiles, consultations, soap_notes, prescriptions, vaccination_schedules, care_plan_steps); denormalise customer_id onto follow_up_messages and care_plan_step_responses as prescriptions already does, so no policy nests more than one level. Re-run the Performance Advisor (Gerard clicks Rerun linter) and iterate until 0 warnings.
4. Indexes: drop the 7 exact duplicates and 8 prefix-redundant indexes listed in the audit; add consultations (customer_id, scheduled_at) WHERE status IN ('pending','scheduled','active'), vet_profiles (id) WHERE is_verified AND is_available, consultations (vet_id) WHERE status = 'active'; recreate idx_consultations_vet_schedule with the active predicate (BRK-10).
5. Replace generate_consultation_number()/generate_prescription_number() with per-day sequences or a UUID-suffixed number; keep the FUR-YYYYMMDD prefix for display.
6. Delete rules per D3: write the ALTER TABLE ... ON DELETE statements for every FK to profiles, consultations, pets, auth.users; add a delete_account(uid) SECURITY DEFINER RPC that anonymises profile fields and deletes or reassigns child rows in the decided order; test it locally against a copy of the schema with seeded rows.
7. handle_new_user: read role from raw_user_meta_data only when the caller is service_role (admin-created vets), default customer; make the invite trigger fire only for customers.

Every migration idempotent (IF NOT EXISTS / DROP IF EXISTS). Provide Gerard a single "run this" file and a verification query that counts rows rather than asserting literals. Write docs/audits/reports/phase-3.md.
```

Exit: `supabase db diff` empty against prod · Performance Advisor 0 warnings · types regenerated and generic applied · account-deletion path passes locally.

## Phase 4 — The server layer

```
Phase 4 of docs/audits/2026-09-14-platform-audit.md. Branch refactor/phase-4-server-layer. Do this one aggregate at a time, each its own commit, routes moved as the service lands: consultations -> booking -> packs/credits -> care plans -> treatment plans -> vets/profile -> notifications/email -> admin -> crons.

Structure:
  src/server/context.ts (Phase 1), errors.ts (AppError with code + status), handler.ts (Phase 0 wrapper extended with zod parsing and role option), logger.ts (JSON logger with request id), schemas/*.ts (zod for every body and query; export the inferred types, written so they can later move to a shared @furrie/contracts package, decision D9), services/*.ts, time.ts (IST helpers: startOfDayIST, startOfWeekIST, formatIST; delete the 17 local formatters and the three UTC "today" computations).
Rules:
  - Consultation state machine: services/consultations.ts exports transition(id, event, actor); the table of allowed transitions is the one in lib/utils/statusHelpers.ts. Routes, crons and the Daily webhook call it; SOAPForm.tsx, ConsultationDetailTabs.tsx and ConsultationDetailContent.tsx stop writing to Supabase and call the API. Reconcile mark-missed and close-stale-active into one rule set.
  - Booking: a book_consultation RPC (insert + credit consumption + promote in one transaction, unique-index violation mapped to 409) or a service with explicit compensation; findAvailableVetForSlot becomes one query (LEFT JOIN on today's load, NOT EXISTS on the slot). Emails and push go in after().
  - PDFs: generate-pdf and finalize enqueue work in after() (or a queue if Gerard approves one) and return a job/status; the client polls or the email delivers.
  - Crons: bulk UPDATE ... WHERE instead of per-row loops; set reminder flags per row before sending, not after; shared cron guard.
  - Error shape: only {error, code} with the codes in errors.ts; delete the AUTH_REQUIRED/UNAUTHORIZED split.
  - Config: src/env.ts validates process.env with zod at boot; .env.example regenerated from it; feature flags read on the server too.
  - Prices: PACK_PRICING becomes the single source and the other two price tables point to it. Do NOT delete the pricing engine, sachets or subscription code in this phase (decision D6); record them in docs/audits/backlog.md for Phase 7.
Keep the 42 mobile route contracts byte-compatible; add a test that snapshots their response shapes. Write docs/audits/reports/phase-4.md.
```

Exit: every route through `handler()`, zod-validated, under 60 lines · one `transition()` · booking transactional · no email/PDF awaited in request · 0 `console.*` in `src/app/api` · Sentry receives an induced 500.

## Phase 5 — Re-render the pages

```
Phase 5 of docs/audits/2026-09-14-platform-audit.md. Branch refactor/phase-5-rendering.

1. Shell: replace CustomerLayout/VetLayout/AdminLayout with one server component PortalShell({ portal, user }) driven by a nav config; a small client ActiveLink reads usePathname; icons become a single icon module. Mount NotificationBell exactly once and pass the initial unread count from the server. Move error.tsx inside each (app) segment so the shell survives page errors.
2. Pages: for each page in the audit's Part A table, collapse sequential awaits into one Promise.all or into sibling async components under Suspense with a segment loading.tsx; add loading.tsx for every [id] segment so list skeletons stop showing on detail pages. Delete withTimeout; failures render an error boundary inside the shell. Fix the vet dashboard redirect (BRK-8).
3. Data down, actions up: ConsultationDetailContent, PetDetailContent, CarePlanDetailContent, VetLayout's availability, InviteCard, TodaySchedulePanel and VetQuickStats receive server data as props; client fetches remain only for user-initiated actions and for slots. useFollowUpChat receives thread and messages from the server and keeps only the realtime subscription; remove the 5 s poll. Vet realtime events call router.refresh() instead of six client queries.
4. Boundaries: convert the two care-plan detail pages and admin credit-requests to server pages; lazy-load TreatmentPlanBuilder and SOAPForm on their tabs; import components directly instead of through barrels; lazy-load medications and diagnoses data.
5. Hygiene: useAdminAuth merges into useAuth; replace the 17 date formatters with server/time.ts; admin badges use Badge + statusHelpers; fix <Link><Button> nesting; memoise the Toast context value; add horizontal scroll containers to admin tables and a mobile nav to the admin shell. Any further deletions need the reference table (D6).
6. Measure: rerun the Phase 0 protocol; commit docs/perf/2026-09-phase-5.md with per-page server hops, client hops, TTFB and settled time before/after, plus route JS sizes from next build output. Write docs/audits/reports/phase-5.md.
```

Exit: per page one parallel batch or streamed sections, no client refetch of server data · bell once, layouts network-free · Lighthouse mobile ≥ 80 on both dashboards · barrels gone.

## Phase 6 — Realtime without polling the log

```
Phase 6 of docs/audits/2026-09-14-platform-audit.md. Branch feat/phase-6-realtime-broadcast.

Replace the four postgres_changes subscriptions (VetLayout vet_profiles UPDATE, TodaySchedulePanel consultations *, useVetDashboardRealtime consultations UPDATE, plus the customer bell already on broadcast) with Supabase Broadcast from the database: a trigger on consultations and vet_profiles calling realtime.broadcast_changes() to topic `user:<id>` for each affected participant, with RLS on realtime.messages so only that user can subscribe (private channels). Client: one useRealtimeUser(userId) hook that opens a single private channel and fans events to bell, schedule and dashboard via a small event bus; router.refresh() for data, local state for the unread counter. Keep the server-side broadcast in createNotification. Ask Gerard to reset pg_stat_statements from the dashboard after deploy and confirm the Query Performance page a day later. Write docs/audits/reports/phase-6.md.
```

Exit: `realtime.list_changes` gone from top queries after a stats reset · Realtime report postgres_changes events = 0 · one private channel per user.

## Phase 7 — Quality floor, dormant-feature removal, repository hygiene

```
Phase 7 of docs/audits/2026-09-14-platform-audit.md. Branch chore/phase-7-quality-floor. Order matters: tests first, deletions last.

1. Tests: vitest with a Supabase test client against a local instance (or a mocked repo layer where a DB is unnecessary): consultations.transition table, booking RPC/service happy and failure paths, zod schemas (reject each SEC-3 field per role), scheduling slot maths in IST across a month boundary, time helpers, invite redemption idempotency. Playwright: seed a test customer and vet with password auth for E2E only; login -> dashboard -> book a slot -> vet sees it -> vet closes with a SOAP note -> customer sees summary -> customer views pets, care plans, profile; vet views patients, schedule, tasks; admin views users, vets, consultations, credit requests. Wire both into CI.
2. i18n per decision D5 (remove): delete next-intl, the provider, the plugin in next.config.ts and public/locales; inline the 291 translated strings as plain English.
3. Dormant features per decision D6, only after step 1 is green: the pricing engine (lib/pricing, api/pricing/compute, pricing_config reads), sachets code paths, and the direct-connect remnants are deleted; the subscriptions UI is hidden behind the existing flag and its tables kept. For each: a reference table in the PR proving zero remaining references, the Playwright suite green, and a preview deployment that Gerard clicks through before merge.
4. Design tokens: replace the 136 hard-coded hex values with tokens; unify the three theme colours to one value; keep the change mechanical and leave palette choices to the brand-refresh project.
5. Repo: move root reports to docs/audits/; write a real README (stack, env, run, migrate, deploy); delete Epilogue/, Pally_Complete/ (fonts already live in public/fonts), the .docx and schema_dump.sql; fix robots.txt and add a sitemap route or drop the reference.
6. PWA basics: manifest icons, a minimal service worker for the app shell, real assetlinks hashes (Gerard supplies the signing certificate fingerprint when the apps resume).
7. Update docs/audits/backlog.md with everything deferred, each with a finding ID. Write docs/audits/reports/phase-7.md.
```

Exit: unit + E2E in CI · coverage on `src/server` above 60% · dormant features gone with reference tables and a clicked-through preview · repo root clean, README real.

## Phase 8 — Shared contracts (when mobile resumes)

Create `@furrie/contracts` (domain types, enums, symptom catalogue, pack pricing, zod schemas for the 42 shared endpoints) consumed by the web route handlers and both apps; merge `furrie` into the pnpm monorepo as `apps/web`. Mobile-side items to carry over: vet app role guard, broken `app.furrie.in/vet/…` portal link, 13 type drifts, JWT-claims logging, 401 sign-out without refresh, ~1,300 duplicated lines between apps. Also at beta launch: install Speed Insights and turn on Observability Plus (D1), and consider one compute size up on Supabase before the first marketing push (D8).

## Decisions — locked by Gerard on 14 September 2026

- **D1 Measurement.** No paid observability now. Sentry tracing at 100% (`SENTRY_TRACES_SAMPLE_RATE=1` in Vercel) plus the manual DevTools protocol for the duration of the work. Speed Insights and Observability Plus at beta launch.
- **D2 Token-based identity.** Yes. Gerard performs the JWT signing-key migration and registers the access-token hook, using the click paths the agent writes in the Phase 0 and Phase 1 reports.
- **D3 Account deletion.** Anonymise the profile and remove the auth user; retain clinical records against the anonymised id; cascade non-clinical data.
- **D4 Payments.** Stay dark (routes return 404) until the Cashfree sprint.
- **D5 next-intl.** Remove.
- **D6 Dormant code.** Delete only with exhaustive verification: a reference table for every deletion, Phase 0 limited to provably unreferenced routes and components, feature-level deletions in Phase 7 after the test suite exists, and a preview click-through by Gerard before merge.
- **D7 Vercel CPU tier / D8 Supabase compute.** Not now; revisit at beta launch or when measurements show CPU-bound work.
- **D9 Monorepo.** Later, when mobile resumes; the contracts-package approach is approved now, so Phase 4 schemas are written to be shareable.
- **D10 SMTP and compute tier.** Checked by Gerard in the Supabase dashboard; no action required.
