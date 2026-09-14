# Furrie Platform Audit — 14 September 2026

Read against `main@33484df` (web, `C:\Users\Aenesh\Desktop\furrie`) and `39ffbe9` (mobile, `C:\Users\Aenesh\Desktop\furrie-mobile`), plus the live Vercel and Supabase dashboards. The execution plan and the per-phase prompts are in `FURRIE-OPUS-BRIEF.md` beside this file. Finding IDs below are the ones the prompts reference.

Scope: web 334 files, 61,785 lines, 78 API routes, 42 pages, 22 migrations. Mobile 20,652 lines, 42 API calls (all matching). Production: Vercel `bom1`, Supabase `ap-south-1`, about 15 customers and 0 vets.

## 1. Verdict

**The slowness is not where it has been looked for.** Region was fixed in May. The database answers every application query in under a millisecond with a 100% cache hit rate, and the tables are nearly empty. What remains is structural: every authenticated page pays three identity checks and a serial chain of two to six queries before any HTML exists, then the browser hydrates and re-fetches much of what the server already had, in some places twice. That tax is paid on every navigation and cannot be tuned away; it has to be designed out.

**The platform is quietly broken in places nobody could see.** A cron job has returned an error on every run for months. Video-call webhooks can never verify. The flag feature, the admin audit trail and the prescribing counter have never written a row. Errors are caught and turned into empty screens or HTTP 200s. Fifteen percent of all function invocations are failing today.

**The code is a working prototype that grew to 60,000 lines without a middle layer.** No service layer, no request validation, no enforced state machine, no typed database access, no tests. The same auth, ownership and role checks are hand-written in dozens of routes with five different shapes. The repository's database definition is not what production runs. None of this needs a rewrite; it needs a middle layer put in once, with routes and pages moved onto it.

**Recommendation.** Stop feature work for the equivalent of eight reviewable pull requests: fix what is verifiably broken, close the security gaps, put in one auth spine and one server layer, make the repo the source of truth for the database, then re-render the pages on top. Measure before and after every phase. The vet-marketplace work starts on this foundation, not beside it.

## 2. Vitals from production (read from the live dashboards on 14 Sep 2026)

| Measure | Value | Source |
|---|---|---|
| Function invocations, last 12 h | 411, of which 410 were cron jobs | Vercel Observability |
| Function error rate | 15%, in spikes every 10 min; all from `close-stale-active` | Vercel Functions |
| Mean execution time of application queries | 0 ms; cache hit rate 100% | Supabase Query Performance |
| Share of DB time in Realtime WAL polling (`realtime.list_changes`) | 68% (479k calls, 0 rows) | Supabase Query Performance |
| Most-called application query | notification-bell unread count, 186k calls | Supabase Query Performance |
| Auth `getUser` lookups | 223k (about one per data request) | Supabase auth schema |
| Performance Advisor | 0 errors, 288 warnings, 67 suggestions | Supabase Advisors |
| Auth hooks configured | 0 | Supabase Auth |
| Speed Insights / Observability Plus | not installed / off; no real-user timing ever collected | Vercel |
| Fluid compute / region / CPU | on / `bom1` only / Standard 1 vCPU, 2 GB; active CPU p75 107 ms | Vercel Functions settings |

Unauthenticated timing from India (curl): `/login` 0.66 s (prerendered CDN hit), `/dashboard` redirect 0.14 s, `/api/pets` 401 in 0.19 s. Authenticated page timing is unknown: no session, no Observability Plus. That is the number that matters.

Not verified: the exact SQL text of production policies (only names and helper functions were visible), and whether the role-escalation path in SEC-5 works against production as opposed to the repository. SMTP mode and compute tier were confirmed by Gerard after the audit (D10).

## 3. Why a page is slow: the anatomy of one view

Customer dashboard, the best-optimised page in the app. Server, before any HTML: (1) middleware `getUser()` at `src/lib/supabase/middleware.ts:37`, a GoTrue call that itself runs sessions and users lookups; (2) middleware `profiles.role` query at `src/middleware.ts:154`, unconditional since #50; (3) page `getUser()` again at `src/lib/supabase/getCurrentUser.ts:14`, because React `cache()` does not span middleware; (4) seven queries in parallel at `dashboard/page.tsx:147`, behind an 8 s silent timeout; (5) render, with the whole 12 KB locale bundle in the payload. Browser, after hydration: `NotificationBell` is mounted twice (`CustomerLayout.tsx:52,107`, both live) so it calls `getUser()` twice, `/api/notifications` twice (each going through a function that re-checks identity) and opens two Realtime channels; `InviteCard` fetches `/api/invites/mine`, data the page batch could have included.

Four sequential server hops before the first byte, then five to seven client hops before the screen settles. On a mid-range Android on a mobile network at 150 to 300 ms per hop, that is two to four seconds of visible loading on the app's fastest page. The vet patient page runs six sequential server queries; the customer consultation page five; the vet consultation page four, then mounts a 1,900-line client tree. The follow-up chat runs three server hops, three more in the browser, then polls every five seconds.

Two design facts make this structural: identity is verified by network calls to the auth server instead of by checking the signed token locally, in two places that cannot share the result; and pages fetch on the server while components fetch again on the client because layouts and panels were written as self-contained widgets.

## 4. Findings ledger

Paths are relative to `src/` unless noted. "verified" = confirmed against live logs or dashboard pages on 14 Sep 2026.

### A. Broken in production right now

| ID | Sev | Finding | Where | Consequence |
|---|---|---|---|---|
| BRK-1 | critical, verified | Cron `close-stale-active` selects a column that does not exist (`room_name`; the column is `daily_room_name`). 500 on every run. | `app/api/cron/close-stale-active/route.ts:34` | Stale calls never auto-close; 15% error rate; Vercel logs show error 42703 |
| BRK-2 | critical | Daily webhook signature uses the wrong scheme (raw secret + hex; Daily uses base64 secret, `timestamp.body`, base64 digest). Secret set: every event rejected. Unset: every event trusted. | `app/api/daily/webhook/route.ts:37-54` | `meeting.ended` / `recording.ready` never process; consultations close only on vet click or when `mark-missed` sweeps them as failed |
| BRK-3 | high | Flag feature writes columns that do not exist (`is_flagged`, `notes`, `status`; real: `details`, `admin_status`). Vets have no SELECT policy on flags. | `app/api/consultations/[id]/flag/route.ts:74-93,176` | POST always 500, PATCH always 404, error discarded |
| BRK-4 | high, verified | Admin audit trail never written: `audit_logs` absent from production (013 never applied) and the writer ignores `{error}`. | `lib/admin/auth.ts:59-65` | No record of vet creation, credit grants, refunds |
| BRK-5 | medium | RPC `increment_prescribing_use_count` is called but exists nowhere. | `app/api/analytics/capture-treatment/route.ts:142` | Prescribing patterns never accumulate |
| BRK-6 | medium | Admin password reset generates a link and never sends it, reports success. | `app/api/admin/password/route.ts:72-75` | Reset is a no-op |
| BRK-7 | medium | Dead status literals `'matching'` and outcome `'no_show'` (real: `'missed'`). | `app/api/admin/health/route.ts:76`, `lib/admin/stats.ts:90`, `vet-portal/(app)/consultations/page.tsx:85` | Health check undercounts; vet "missed" tab always empty |
| BRK-8 | medium | Vet dashboard 8 s timeout yields null profile → `redirect('/login?error=wrong_account')`; middleware bounces the authenticated user back. | `vet-portal/(app)/dashboard/page.tsx:129-132` | Redirect loop with a misleading message |
| BRK-9 | medium | Booking not transactional: credit consumed, then promote can fail, route still returns 200. | `app/api/consultations/book/route.ts:248-276` | Paid credit lost; consultation cancelled 2 h later |
| BRK-10 | low | `idx_consultations_vet_schedule` keeps its `in_progress` predicate; 004 re-created it with `IF NOT EXISTS` on the same name. | `supabase/migrations/002:68` vs `004:91` | Index never covers `active` rows |

### B. Security

| ID | Sev | Finding | Where |
|---|---|---|---|
| SEC-1 | critical | `admin/setup-webhooks` has no authentication. Lists Daily webhooks, registers arbitrary receivers and returns the HMAC secret, deletes all webhooks. Zero callers. Delete. | `app/api/admin/setup-webhooks/route.ts` |
| SEC-2 | critical | With `NEXT_PUBLIC_SKIP_PAYMENTS=true` (shipped default) the payments webhook skips signature verification; any POST with `order_status: PAID` completes a payment, schedules a consultation, mints a pack. `packs/purchase` grants active packs for ₹0. The flag is browser-visible. | `app/api/payments/webhook/route.ts:23-32,107-152,268`; `app/api/packs/purchase/route.ts:92-126` |
| SEC-3 | critical | `PATCH /api/consultations/[id]` passes the raw body through the mapper and writes with the service role: a customer can set `vetId`, `amountPaid`, `paymentId`, `dailyRoomUrl` and move `pending → scheduled` without paying. | `app/api/consultations/[id]/route.ts:365-390`; `lib/utils/consultationMapper.ts:83-105` |
| SEC-4 | critical, definer confirmed in prod | `consume_pack_credit(p_customer_id, …)` is SECURITY DEFINER with default EXECUTE for anon/authenticated and takes the victim id as a parameter. Migration 021 shows the correct pattern. | `supabase/migrations/015:123` vs `021:124-127` |
| SEC-5 | critical | `profiles` UPDATE policy has no WITH CHECK and no column restriction; nothing protects `role`. Middleware and every admin policy trust that column. Verify against production with a test account. | `supabase/migrations/000:787` |
| SEC-6 | high | Over-broad policies: vets can set own `is_verified`/ratings; vets can reassign `vet_id`/`customer_id`/`amount_paid`; customers can insert consultations as `scheduled`, `is_free`; customers can extend follow-up expiry and rewrite vet care-plan instructions. | `000:853`, `000:885`, `000:877`, `007:12`, `010:134` + `care-plans/[id]/steps/[stepId]/route.ts:24` |
| SEC-7 | high | Anon-readable: `consultation_ratings` `USING (true)` exposes `customer_id` and feedback; unredeemed `sachet_codes` enumerable; 75 of 90 policies lack `TO authenticated`. | `000:1025`, `000:994` |
| SEC-8 | high | All seven crons fail open when `CRON_SECRET` is unset; Daily webhook trusts all when its secret is unset; `!==` compares; no timestamp window. | `app/api/cron/*/route.ts`, `app/api/daily/webhook/route.ts:54` |
| SEC-9 | high | Next.js 16.1.6: two critical advisories (request smuggling in rewrites, on which the subdomain model rests; RCE in image optimisation with AVIF, which `next.config.ts` enables) plus middleware-bypass advisories. `npm audit`: 36 issues; fix 16.3.5. `next-intl` open-redirect advisory. | `package.json:18`, `next.config.ts:16` |
| SEC-10 | medium | Open redirect in legacy callback (`next=//evil.com`); `email/consultation-completed` never checks participation; `invites/validate` public, unlimited, falsely documented as rate-limited; `admin/vets` emails plaintext passwords; `listUsers()` unpaginated (silent failure past 50 users). | `app/api/auth/callback/route.ts:21-28`; `email/consultation-completed:28-49`; `invites/validate:5`; `admin/vets:140`; `admin/bootstrap:83` |
| SEC-11 | medium | Service-role client imported by 37 of 78 routes; at least eight could use the user client plus RLS. | `consultations/[id]:29-137`, `join:47-76`, `soap-notes:45`, `treatment-plans:120`, `book:182,305,327,352` |
| SEC-12 | medium | Sentry ships PII (`sendDefaultPii: true`, `includeLocalVariables`); logs print recipient emails and Daily payloads; mobile logs JWT claims. | `sentry.server.config.ts:6,12`; `lib/email/index.ts:56`; `lib/daily/index.ts:91`; mobile `apps/customer/lib/api.ts:65` |

### C. Data layer

| ID | Sev | Finding | Where |
|---|---|---|---|
| DB-1 | critical, verified | Repository schema is not what production runs. Production has SECURITY DEFINER `is_admin()`, `is_vet()`, `can_vet_see_care_attachment()` that appear in no migration. The repo's admin policy on `profiles` selects from `profiles` (infinite recursion as written), so policies were rewritten out of band. `audit_logs` missing. No migration tracking; 13 of 22 files fail on re-run. | `supabase/migrations/000:791`; `lib/database.types.ts:2089-2105` |
| DB-2 | high, 288 warnings | RLS in its most expensive form: 98 bare `auth.uid()` (0 wrapped); 29 policies with correlated `EXISTS` into `profiles` (pulling that table's four policies per row); eight tables with ≥3 permissive SELECT policies; follow-up messages and care-plan responses nest three RLS layers. Cheap now because tables are empty; this is the scaling wall. | `supabase/migrations/000, 005-016` |
| DB-3 | high, 68% of DB time | Four `postgres_changes` subscriptions make Realtime poll the WAL continuously. The bell already uses Broadcast correctly. | `components/layouts/VetLayout/VetLayout.tsx:58`; `components/vet/TodaySchedulePanel.tsx:203`; `hooks/useVetDashboardRealtime.ts:75` |
| DB-4 | high | Generated `Database` type passed to none of the five client factories; every query result is effectively `any`. Hand-written types drift (`Consultation` lacks four columns; mobile mirror has 13 drifts). | `lib/supabase/server.ts:15`, `client.ts:10`, `admin.ts:11`, `lib/auth/withAuth.ts:68` |
| DB-5 | medium | `generate_consultation_number()` / prescription equivalent: LIKE-prefix scan per insert, race, 999/day cap. | `000:161-181, 310-330` |
| DB-6 | medium | Delete rules NO ACTION on `consultations.customer_id/vet_id/pet_id`, `payments.consultation_id`, `consultation_pack_uses`, `consultation_media.uploaded_by`, `care_plan_step_responses.user_id`; account deletion cannot be built until decided (D3). | `000, 009, 010, 012` |
| DB-7 | low | Over-indexed: 7 exact duplicates of unique indexes, 8 prefix-redundant, ~12 low-selectivity booleans; one useful partial index missing. `handle_new_user` births every account as customer, so the invite trigger issues codes to vets and admins. | `000:298,506,707`; `008:42-44`; `016:105` |

### D. Architecture and code structure

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| ARC-1 | high | No server layer. 78 routes hand-roll auth (five helper shapes, four inline admin-gate copies), role lookup (26 routes re-query `profiles.role` after middleware did), ownership (the load-consultation-and-compare block copy-pasted in 12 files, three variants), validation (bodies `as`-cast; schemas only for treatment plans and SOAP), error shape (four variants). | `lib/admin/auth.ts` vs `admin/consultation-requests:21`, `consultation-packs:24`, `email-test:14`, `submissions/[id]:15`; `soap-notes:31` is the good one |
| ARC-2 | high | State machine documented in `statusHelpers.ts`, enforced nowhere. Transitions hand-coded in nine routes and three client components writing directly to Supabase (finishing a consultation happens client-side, twice). Two crons encode conflicting rules for `active` rows. | `SOAPForm.tsx:343`; `ConsultationDetailTabs.tsx:73`; `ConsultationDetailContent.tsx:134`; `mark-missed` vs `close-stale-active` |
| ARC-3 | high | Three data paths: 24 of 42 pages query Supabase directly with raw rows (89 snake_case reads in JSX); client components call `/api`; some clients write to Supabase directly. Mappers exist but only the customer portal uses them. Mobile bypasses the API in three places. | `lib/utils/*Mapper.ts`; vet-portal pages use no mapper |
| ARC-4 | high | Multi-step writes without transactions: booking, care-plan create (orphan plan), finalize (orphan PDF), rating (check-then-insert race), payments webhook (every failure returns 200 so the gateway never retries), vet profile. | `book:195-276`; `care-plans:146-178`; `finalize:153-246`; `rate:78-111`; `payments/webhook:107-279` |
| ARC-5 | high | Waterfalls: booking 19 sequential round trips plus two per candidate vet (matcher N+1); finalize 12; prescription PDF 10; follow-up thread create 9; crons four to six queries per row; PDFs rendered, uploaded and emailed in the request; booking sends two emails sequentially before responding. | `book/route.ts`; `lib/scheduling/index.ts:218-257`; `send-reminders:80-160` |
| ARC-6 | medium | "Today" computed in UTC in four places (including the vet load-balancer's daily count); reminder text renders 10:00 IST as "04:30 am"; 17 local date formatters; the correct IST helper is not exported. | `vet/stats:31`; `lib/admin/stats.ts:29`; `lib/scheduling/index.ts:105,213,399`; `send-reminders:68,190` |
| ARC-7 | medium | Config ad hoc: 26 env keys at 60 sites with ten `!` assertions, seven undocumented; a browser-visible flag controls server payment behaviour; flags file claims UI-only while gating five routes; prices in three places; pricing engine unreachable. | `lib/config/features.ts`; `lib/payments/index.ts:15`; `lib/pricing/index.ts:48,291`; `types/index.ts:255` |
| ARC-8 | low | Dead weight: 14 routes with no caller in either repo, six dead components (~1,700 lines with CSS), 40+ dead exports, an unused hook, unused deps (`react-dropzone`, `lucide-react`, `xlsx`), a `next.config` optimisation naming uninstalled packages, 14 MB of font sources, a `.docx` and an empty SQL dump at root, gitignored `docs/`. | `components/consultation/MatchingScreen, PreJoinScreen, PaymentButton`; `customer/SignupForm, LoginForm`; `hooks/useConsultations` |

### E. Frontend and rendering

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| FE-1 | high | Three identity round trips before page code on every authenticated request. #50 made the role lookup unconditional; the rejected fix (cached role) was wrong, the right one (role claim in the token) was never built. | `middleware.ts:106,154`; `getCurrentUser.ts:14` |
| FE-2 | high | Client refetch storm: `NotificationBell` mounted twice per customer page; `VetLayout` refetches what the vet dashboard loaded; `ConsultationDetailContent` refetches the row the list had; follow-up chat makes three sequential client calls then polls; one vet realtime event triggers six client queries. | `CustomerLayout.tsx:52,107`; `VetLayout.tsx:43-51`; `ConsultationDetailContent.tsx:106`; `useFollowUpChat.ts:55-135`; `VetQuickStats.tsx:26-70` |
| FE-3 | high | No streaming: zero `Suspense` around data; `loading.tsx` inherited onto wrong pages; `error.tsx` above the portal shell so any page error removes navigation. | `consultations/loading.tsx` → `consultations/[id]`; `customer-portal/error.tsx` |
| FE-4 | high | `withTimeout` resolves to empty data silently; admin dashboard renders zeros as KPIs after 8 s. | `lib/utils/queryTimeout.ts:10`; admin `dashboard/page.tsx:37`; customer `dashboard:147`; vet `dashboard:129` |
| FE-5 | medium | Boundary mistakes: four client-only pages that fetch from the browser; three client layouts for `usePathname`; vet consultation page hands a 1,900-line client tree to the overview tab; barrel imports register the video room on the customer dashboard route; 11 KB of medication/diagnosis data eager. | `…/care-plans/[planId]/page.tsx` ×2; admin `credit-requests/page.tsx`; vet `consultations/[id]/page.tsx:705`; customer `dashboard/page.tsx:13,16` |
| FE-6 | medium | Duplication: three portal layouts (680 lines, 24 inline icons); three error pages; four login forms (two dead); two auth hooks; finish-consultation twice; vet stats twice; four consultation-card variants; 17 date formatters; three admin badge maps. | `layouts/*`; `hooks/useAuth` vs `useAdminAuth`; `SOAPForm:321` vs `ConsultationDetailTabs:66` |
| FE-7 | medium | 118 CSS modules, 19,315 lines; 136 hard-coded hex in 18 files against 122 tokens; three conflicting theme colours (`#1E5081`, `#770002`, `#3971b8`); admin has no mobile nav and tables without scroll; 24 `<Link><Button>` nestings; Toast context re-renders every consumer. | `TreatmentPlanPreview.module.css`; `AdminLayout.module.css:142`; `ui/Toast/Toast.tsx:66` |
| FE-8 | low | i18n half-done: 291 keys vs 450+ hard-coded strings; full bundle serialised into every page. | `app/layout.tsx:55,60`; `i18n/request.ts` |
| FE-9 | low | Not a PWA: no manifest icons, no service worker, placeholder `assetlinks.json`, `robots.txt` points to a missing sitemap. | `public/manifest.json`; `public/.well-known/assetlinks.json` |

### F. Observability, testing, delivery

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| OBS-1 | high | 407 `console.*` calls; 0 `Sentry.captureException` in the API across 123 catch blocks; twelve routes convert failures to 2xx; no request id; health check counts a dead status. | `src/app/api/**`; `instrumentation.ts` |
| OBS-2 | high | No tests, no CI, no hooks, stock lint; typecheck last known clean in May. | no `.github/`, no `*.test.*` |
| OBS-3 | high, verified | No measurement: Observability Plus off, Speed Insights never installed, Sentry tracing 25% of near-zero traffic. | Vercel Speed Insights: "No events collected" |

### G. Mobile monorepo (parked)

All 42 API calls exist on the web with the right verb. Structural issues: vet app has no role guard; the "open in web portal" link points at `app.furrie.in/vet/…` (does not exist; should be `vet.furrie.in/consultations/<id>`); ~1,300 byte-identical lines between the two apps; `packages/ui` exports nothing; `packages/shared` hand-mirrors web types with 13 drifts; any 401 signs out without a refresh attempt; Sentry stub; zero tests; package lint scripts are `echo skipped`. Argues for a shared contracts package and, later, one monorepo.

## 5. What is healthy

Well-conceived schema (130 indexes, 25-field SOAP model, versioned treatment plans, correct partial indexes). Migration 021 is the model for atomic RPCs. `GET /api/vet/consultations` and the `soap-notes` route's `authorizeAssignedVet` are the model route and helper. Bearer-aware auth landed in 48 routes. The customer dashboard batches correctly and uses `after()`. The bell uses Broadcast. Breed data lazy-loads; `@react-pdf` stays server-side; Daily is dynamically imported. A real UI primitive set exists. The mapper layer is the right idea, under-adopted.

## 6. Target architecture

**Request path.** `proxy.ts` (Next 16 name for middleware) does routing only, verifies the session locally with `getClaims()` and reads `role` from a claim; zero DB calls. A Custom Access Token hook copies `profiles.role` into the JWT at issue time; the admin promote action forces a global sign-out. One request-cached `getRequestContext()` returns `{ userId, role, supabase }` for cookie and bearer callers; `requireRole` and `requireOwner` are the only guards. Every route is `handler({ schema, roles }, fn)`: zod parse, context, `AppError` → `{ error, code }`, request id, Sentry. No route over 60 lines.

**Domain and data.** `src/server/services/` per aggregate; the consultation state machine has one `transition()` entry point used by routes, crons and webhooks; booking is one RPC transaction; side effects in `after()`. `Database` generic on every client, types regenerated from production in CI. RLS as the last line: `(select auth.uid())`, `is_admin()`/`is_vet()` reading the JWT claim, one permissive SELECT per table, `TO authenticated` everywhere, WITH CHECK on every write, service role only for crons/webhooks/admin. Migrations are the source of truth: a baseline dumped from production, CLI-tracked timestamps, `supabase db diff` in CI, no hand-run DDL. Realtime via Broadcast from triggers, one private channel per user.

**Rendering.** One server-rendered portal shell with a nav config and a tiny client `ActiveLink`; bell mounted once; layouts make no network calls. Each page fetches in one parallel batch or streams sections under `Suspense`; segment-level `loading.tsx` and `error.tsx` inside the shell; `withTimeout` removed. Server data flows down as props; client fetches only for user-initiated actions. Client-only pages become server pages; heavy editors load on their tab; direct imports replace barrels.

## 7. Plan

Eight phases, each a branch and a PR with entry/exit criteria; prompts and operating rules in `FURRIE-OPUS-BRIEF.md`. 0 stabilise and measure · 1 auth spine · 2 security · 3 database truth · 4 server layer · 5 re-render · 6 Realtime broadcast · 7 quality floor and dormant-feature removal · 8 shared contracts when mobile resumes.

## 8. Decisions (locked 14 Sep 2026)

D1 no paid observability now; Sentry tracing at 100% plus the manual protocol; Speed Insights and Observability Plus at beta launch. D2 asymmetric JWT keys plus access-token hook, done by Gerard before Phase 1. D3 anonymise on account deletion, retain clinical records. D4 payments dark. D5 remove next-intl. D6 delete only with a reference table per item; Phase 0 limited to provably unreferenced code; feature deletions in Phase 7 after tests, with a preview click-through. D7/D8 no compute upgrades now. D9 monorepo later; contracts package approved. D10 SMTP and compute tier confirmed by Gerard.

## 9. Method

Local `main` fast-forwarded to `origin/main` before reading; the squash-merged auth branch confirmed fully merged. Five parallel read-only sweeps (routes; pages and components; migrations; libraries and tooling; mobile), every claim checked against the cited file, the highest-impact ones re-read by the lead. Production evidence from Vercel Observability, Functions, Middleware and Logs pages and Supabase Query Performance, Advisors, Functions, Policies, Auth Hooks, SMTP and Realtime pages, read through Gerard's logged-in browser without executing anything.
