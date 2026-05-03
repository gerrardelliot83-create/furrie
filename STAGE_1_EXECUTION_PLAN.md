# Stage 1 Execution Plan — Performance Fixes

**Status:** Awaiting approval before execution
**Branch strategy:** Single `perf/audit-fixes` branch from `main`
**Measurement strategy:** Skip rigorous before/after telemetry; capture informal DevTools snapshots
**Stage gate at end:** Manual verification + production deploy decision before continuing to Stage 2

---

## Ownership convention

Each batch tagged with one of:

- **[Claude]** — I make the code change.
- **[Founder]** — You handle a third-party platform action.
- **[Collaborative]** — Joint action; I produce the change, you apply it on the platform side, we verify together.

---

## Pre-flight checks (before any batch)

| Check | How | Owner |
|---|---|---|
| `.git/index.lock` is cleared | Run `del .git\index.lock` in `C:\Users\DELL\Desktop\furrie` | [Founder] |
| `main` branch is clean and up-to-date | `git checkout main && git pull origin main` | [Claude] |
| Create `perf/audit-fixes` branch | `git checkout -b perf/audit-fixes` | [Claude] |
| Commit `PERFORMANCE_AUDIT.md` and this file | Add and commit to perf branch | [Claude] |
| Confirm `npm run typecheck` passes from clean main | Run before any change | [Claude] |
| Confirm `npm run lint` passes from clean main | Run before any change | [Claude] |
| Capture informal "before" DevTools snapshot | Hard reload customer dashboard, save Network tab summary | [Founder] |

---

## Execution batches

Batches are sequenced from lowest-risk to highest-risk. Discussion gates pause execution for a focused conversation before resuming. Each batch ends with verification before moving to the next.

---

### Batch 1 — Documentation and configuration tweaks

**Findings addressed:** F-02, F-01 (code side only), F-18, F-05

**Scope:**
- Update `CLAUDE.md` to correct Supabase region (Singapore → Mumbai). Add Vercel region note.
- Add `regions: ["bom1"]` to `vercel.json`.
- Add `experimental.optimizePackageImports` and `images.formats` to `next.config.ts`.
- Bump `tracesSampleRate` from `0.1` to `0.25` in `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`.

**Files modified:**
- `CLAUDE.md`
- `vercel.json`
- `next.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation-client.ts`

**Risk level:** **LOW**. All configuration; no behavior changes.

**Risk analysis:**
- `regions: ["bom1"]` in `vercel.json` does NOT, by itself, change deployment region — Vercel UI setting takes precedence. Adding to file makes the setting version-controlled going forward.
- `optimizePackageImports` is a documented stable feature (no longer experimental in Next.js 16, but the config key still works).
- Bumping Sentry sample rate increases quota consumption. At current traffic, well within free tier.

**Rollback approach:** `git revert` the commit. No data or schema impact. Vercel redeploys automatically.

**Verification steps:**
1. `npm run typecheck` passes.
2. `npm run lint` passes.
3. `npm run build` succeeds.
4. Visual inspection of `next.config.ts` for syntax errors.
5. After deploy: confirm Sentry receives a higher event volume in the next hour.

**Ownership:** [Claude] code changes. [Founder] applies the actual Vercel function region change in the dashboard once we deploy this batch. [Collaborative] verification.

**Estimated effort:** 30 minutes code + 24-hour observation window.

**The Vercel dashboard step (critical):**
1. Go to Vercel → Furrie project → Settings → Functions.
2. Change "Function Region" from `iad1` (Washington DC) to `bom1` (Mumbai).
3. Trigger a redeploy from the Deployments tab.
4. Wait ~5 minutes for new deployment to be live.

---

### Batch 2 — Public route exclusion from auth middleware

**Findings addressed:** F-16

**Scope:**
- Modify `src/middleware.ts` to exclude `/customer-portal/terms` and `/customer-portal/privacy` from the auth check.
- Optionally mark these pages with `export const dynamic = 'force-static'` for full caching.

**Files modified:**
- `src/middleware.ts`
- `src/app/customer-portal/(app)/terms/page.tsx`
- `src/app/customer-portal/(app)/privacy/page.tsx`

**Risk level:** **LOW**.

**Risk analysis:**
- These pages don't read user-specific data, so removing auth doesn't expose anything.
- Force-static rendering means the page HTML is generated at build time, not per-request. Confirm both pages don't use `cookies()` or `headers()`.
- Edge case: if a logged-in user visits `/terms`, they should still see the terms (yes, they will). If a logged-out user visits, they should also see terms (currently they get redirected to login — that's the bug we're fixing).

**Rollback approach:** `git revert` the commit. Public pages would re-route through middleware as before.

**Verification steps:**
1. In an Incognito window (no auth), visit `/terms` and `/privacy` directly. Should render the pages, not redirect to login.
2. Logged-in: same pages should also render normally.
3. `npm run build` confirms static generation worked.

**Ownership:** [Claude] code; [Founder] verification post-deploy.

**Estimated effort:** 20 minutes.

---

### Batch 3 — Parallelize sequential Server Component queries (HIGH IMPACT)

**Findings addressed:** F-14

**Scope:** Refactor three pages from sequential `await` chains to `Promise.all`.

**Files modified:**
- `src/app/customer-portal/(app)/connect/page.tsx` — five sequential queries, becomes `getUser()` then `Promise.all([4 queries])`
- `src/app/customer-portal/(app)/care-plans/page.tsx` — three sequential, becomes `getUser()` then `Promise.all([2 queries])`
- `src/app/vet-portal/patients/[id]/page.tsx` — three sequential, becomes `getUser()` then `Promise.all([2 queries])`

**Risk level:** **MEDIUM**.

**Risk analysis:**
- The main risk is parallelizing queries that secretly depend on each other. Specifically, if any query reads a result computed from a previous query (other than `user.id`), we'd break it.
- Audit: I already verified `connect/page.tsx` queries 2-5 are independent (each reads `user.id` only). Care-plans and vet patient detail need the same audit before changing.
- `Promise.all` rejects on first error. Today's sequential code fails on first error too, so behavior under failure is the same. If we want partial-success semantics (one query failing doesn't block the page), use `Promise.allSettled` and handle nulls — already the pattern in the dashboard's `withTimeout(allQueries, ..., fallback)`.

**Rollback approach:** `git revert`. The pages return to sequential queries. No data impact.

**Verification steps:**
1. `npm run typecheck` passes.
2. `npm run lint` passes.
3. Manual: load `/connect` logged in. Verify pets list, subscription state, pack credits, pending consultations all render correctly.
4. Manual: load `/care-plans` logged in. Verify care plans + pets render.
5. Manual (vet account needed): load `/vet-portal/patients/[some-pet-id]`. Verify all sections render.
6. Network tab: confirm 4 queries fire roughly in parallel (not staggered) for `/connect`.

**Ownership:** [Claude] code. [Founder] manual page verification post-deploy.

**Estimated effort:** 90 minutes for code + per-page audit.

---

### Batch 4 — Link prefetch deduplication

**Findings addressed:** F-08, F-09 (likely auto-resolved)

**Scope:** Set `prefetch={false}` on the secondary nav (whichever of mobile/desktop nav is duplicating) so each route is prefetched only once per page.

**Files modified:**
- `src/components/layouts/CustomerLayout/CustomerLayout.tsx` (likely)
- Possibly the vet and admin layouts if they have the same pattern.

**Risk level:** **LOW**.

**Risk analysis:**
- Disabling prefetch on the secondary nav means navigation from those Link components costs one extra round-trip on the first click. After F-01 (Vercel region fix), this round-trip is ~250ms — barely perceptible.
- If we disable on the wrong nav (e.g., the one currently visible to the user), all navigation feels slower for one click. Mitigation: choose the nav based on which is hidden by default at the current viewport (mobile vs desktop).

**Rollback approach:** `git revert`. Both navs prefetch again as before.

**Verification steps:**
1. Console warnings count: open DevTools, hard reload dashboard, count warnings. Should drop from 27 to under 5.
2. Click a nav link from the secondary nav. Should still navigate (just with a brief delay).
3. Click the same link from primary nav. Should be instant (prefetched).

**Ownership:** [Claude] code, [Founder] verification.

**Estimated effort:** 30 minutes.

---

### Batch 5 — Column whitelisting (over-fetch cleanup)

**Findings addressed:** F-19

**Scope:** Replace `select('*')` with explicit column lists on the connect page (and any others discovered in the process).

**Files modified:**
- `src/app/customer-portal/(app)/connect/page.tsx` (pets query)
- Any other `select('*')` calls discovered during audit (will grep before changing).

**Risk level:** **LOW** but easy to introduce bugs.

**Risk analysis:**
- If we forget to whitelist a column that the consuming component reads, we get a TypeScript error at best (if types are tight) or `undefined` at runtime (if types are loose).
- Mitigation: read each consumer carefully and list every column it touches. The `mapPetFromDB` utility in `src/lib/utils/petMapper.ts` is the canonical mapping — its inputs tell us the required columns.

**Rollback approach:** `git revert`. Returns to over-fetching but functional.

**Verification steps:**
1. `npm run typecheck` passes.
2. Manual: every consumer of the changed query renders correctly. Specifically `/connect` ConnectFlow.

**Ownership:** [Claude] code, [Founder] verification.

**Estimated effort:** 30 minutes.

---

### **DISCUSSION GATE D-1 — Auth caching strategy**

**Pause execution. Approve approach before Batch 6.**

**Question:** How should we eliminate the double `getUser()` per page request?

**Options:**

**A. React `cache()` wrapper (simpler).** Create a `getCurrentUser()` helper that wraps `supabase.auth.getUser()` in React's `cache()` for request-scoped deduplication. Pages keep calling `getCurrentUser()` independently; the second call within the same request returns the cached result without a network call. The middleware still does its own `getUser()` for routing decisions — that round-trip stays.

- Pros: Tiny change. Safe. Doesn't touch middleware.
- Cons: Still one auth round-trip per page render (the page-side one is cached, but middleware's call is separate).
- Effort: 1 hour.

**B. Pass user from middleware via request headers (more complete).** Middleware sets a `x-user-id` header (or full user JSON) on the response. Pages read from headers instead of calling `getUser()` at all. Eliminates auth round-trips on the page side entirely.

- Pros: Maximum savings (~one Mumbai round-trip per page eliminated).
- Cons: More plumbing. Headers must be cryptographically trustworthy (sign with a server secret, or trust the middleware-set header because nothing else can set it). Edge cases around middleware errors propagating to pages.
- Effort: 4-6 hours.

**Recommendation:** **A first.** It's safe, fast to implement, and solves 80% of the problem. After F-01 (Vercel region fix), the remaining one round-trip per page is ~5ms — not worth the engineering effort of B yet.

**Decision needed before Batch 6 begins.**

---

### Batch 6 — Auth helper migration

**Findings addressed:** F-04

**Scope (assuming Option A from D-1):**
- Create `src/lib/supabase/getCurrentUser.ts` exporting a `cache()`-wrapped `getCurrentUser()`.
- Migrate every `page.tsx` that calls `supabase.auth.getUser()` to call `getCurrentUser()` instead.

**Files modified:** Estimated 15-20 page.tsx files across customer, vet, admin portals.

**Risk level:** **MEDIUM-HIGH** (touches every authenticated page).

**Risk analysis:**
- Bug surface large because every page is affected.
- React's `cache()` is safe and well-documented; it's request-scoped, not cross-request.
- If a page expects a fresh `getUser()` result mid-render (rare), this would cache too eagerly. Audit: search for any `getUser()` call after a database write — those need to bypass the cache. Likely none exist.
- Migration risk: missing a page means inconsistent behavior. Need a methodical grep + verify pass.

**Rollback approach:** `git revert`. Every page returns to direct `getUser()` calls.

**Verification steps:**
1. `npm run typecheck` passes.
2. `npm run lint` passes.
3. Auth still works: log in, log out, navigate between portals.
4. Smoke test: visit dashboard, connect, pets, consultations, care-plans, profile. Each should render with correct user data.
5. Vet smoke test: log in as vet, check vet dashboard, schedule, queue.
6. DB query report 24 hours after deploy: `auth.users` lookup count should drop noticeably (currently 207k/week).

**Ownership:** [Claude] code, [Founder] auth smoke testing.

**Estimated effort:** 2 hours.

---

### **DISCUSSION GATE D-5 — Image optimization strategy**

**Pause execution. Approve approach before Batch 7.**

**Question:** How should we handle the raw `<img>` tags loading 2-4 MB pet photos?

**Options:**

**A. Replace each `<img>` with `<Image>` from `next/image`.**
- Pros: One-line-per-call; consistent with dashboard usage; Next.js handles optimization, format negotiation (AVIF/WebP), and resizing through its built-in image optimizer.
- Cons: Each image fetch goes through a Vercel function (the image optimizer). Adds one more hop. Consumes Vercel image-transformation quota.
- Effort: 1-2 hours.

**B. Build a custom `<PetImage>` wrapper that uses Supabase Storage's image transformation API.**
- Pros: Direct CDN delivery from Supabase (no Vercel hop); transformations like `?width=200&height=200&resize=cover` are server-side at Supabase. Faster runtime, lower Vercel cost.
- Cons: More upfront code (a new component); responsive sizes need manual `srcSet` handling.
- Effort: 3-4 hours.

**C. Hybrid.** Use `<PetImage>` (B) for pet photos specifically, since they're consistently from Supabase Storage and dominate page weight. Keep `<Image>` (A) for everything else.
- Pros: Best of both. Optimizes the high-impact case.
- Cons: Two patterns to maintain.

**Recommendation:** **C, with B as the implementation for `<PetImage>`.** Pet photos are the actual weight problem. Other images (logos, icons, etc.) are already small or use `next/image` correctly.

**Decision needed before Batch 7 begins.**

---

### Batch 7 — Image optimization

**Findings addressed:** F-17

**Scope (assuming Option C from D-5):**
- Create `src/components/ui/PetImage.tsx` using Supabase Storage image transformation parameters.
- Replace all raw `<img>` tags reading from Supabase Storage URLs with `<PetImage>`.
- Replace any other raw `<img>` tags with `<Image>` from `next/image`.

**Files modified:**
- `src/components/ui/PetImage.tsx` (new)
- `src/app/vet-portal/patients/[id]/page.tsx`
- `src/app/customer-portal/(app)/pets/[id]/care-plans/[planId]/page.tsx`
- `src/app/vet-portal/consultations/[id]/page.tsx`
- `src/components/customer/ConsultationDetailContent.tsx`
- Plus any others found via grep.

**Risk level:** **MEDIUM**.

**Risk analysis:**
- Layout shift if `width`/`height` props don't match the displayed size. Mitigation: keep CSS-driven sizing, set `width`/`height` props to a sensible aspect-ratio baseline.
- Supabase image transformation is a paid feature on some plans — confirm it's available on Furrie's current plan before relying on it. Free tier includes basic transforms; verify.
- If transformation API URL format changes between Supabase versions, existing image URLs break. Lock the API version explicitly.

**Rollback approach:** `git revert`. Pages reload images at original size. No broken pages.

**Verification steps:**
1. `npm run typecheck` passes.
2. Visual inspection of every page that displays pet photos.
3. Network tab: confirm pet images now load at <100 KB each instead of 2-4 MB.
4. No layout shift warnings in DevTools Performance.

**Ownership:** [Claude] code; [Founder] visual + network verification.

**Estimated effort:** 4-5 hours.

---

### **DISCUSSION GATE D-4 — ISR staleness window**

**Pause execution. Approve before Batch 8.**

**Question:** What's the acceptable staleness window for vet patient detail and consultation detail pages?

**Context:** A vet viewing patient history should not miss a SOAP note made by another vet seconds ago. Yet revalidating on every request defeats caching.

**Options:**

**A. 60-second revalidate.**
- Pros: Most caching benefit. 60 seconds is a typical user "scroll then click again" loop.
- Cons: A vet who's just submitted data, then navigates back, might see their own pre-submission state for up to 60s. Confusing.

**B. 30-second revalidate + targeted `revalidatePath` after writes.**
- Pros: Stale only for unrelated changes. Same vet's writes invalidate immediately.
- Cons: Need to add `revalidatePath` calls after every write API route. More code surface.

**C. 10-second revalidate.**
- Pros: Conservative. Fast enough that most data freshness concerns disappear.
- Cons: Less caching benefit.

**D. No ISR, keep `force-dynamic`. (Reject the finding.)**
- Pros: Always-fresh data, no staleness risk.
- Cons: Original problem stands — every page hit re-runs auth + queries.

**Recommendation:** **B.** Best balance. Adding `revalidatePath` calls is mechanical. Discussion is only about whether the team is willing to maintain those calls discipline-wise.

**Decision needed before Batch 8 begins.**

---

### Batch 8 — ISR migration on detail pages

**Findings addressed:** F-15

**Scope (assuming Option B from D-4):**
- Remove `export const dynamic = 'force-dynamic'` from `vet-portal/patients/[id]/page.tsx` and `vet-portal/consultations/[id]/page.tsx`.
- Add `export const revalidate = 30;` to each.
- Add `revalidatePath('/vet-portal/patients/{id}')` and `revalidatePath('/vet-portal/consultations/{id}')` calls in every API route that mutates relevant data.

**Files modified:**
- `src/app/vet-portal/patients/[id]/page.tsx`
- `src/app/vet-portal/consultations/[id]/page.tsx`
- `src/app/api/consultations/[id]/route.ts` (add revalidatePath)
- Any API route that writes SOAP notes, prescriptions, ratings, flags, etc. (audit needed)

**Risk level:** **MEDIUM**.

**Risk analysis:**
- If we miss a write path that doesn't call `revalidatePath`, that change is invisible to the cached page for up to 30 seconds. Compliance risk if it's a medical record.
- ISR pages bypass middleware on cache hits — auth is NOT re-checked on cache. This is fine because ISR is per-route-not-per-user, but we need to confirm the ISR cache key includes user-specific data correctly. Vet patient detail pages should be cached per-vet, not globally.
- Currently `vet-portal/patients/[id]` reads `user.id` and uses it for auth — this needs careful handling under ISR. Possible solution: keep page dynamic, but cache the data fetches with `cache()` instead.

**Open question requiring D-4 decision plus a technical follow-up:** Pages that vary by viewer cannot be ISR-cached at the route level. Need to either (a) split static and dynamic parts, or (b) use `cache()` on fetches without ISR on the route.

**Rollback approach:** `git revert`. Pages return to `force-dynamic`.

**Verification steps:**
1. `npm run build` confirms ISR is working (build output mentions "(ISR)" for these routes).
2. Multi-vet test: vet A submits a SOAP note; vet B navigates to same patient. Should see the new note within 30 seconds (or immediately if `revalidatePath` worked).
3. Same vet flow: vet submits a note, navigates back. Should see the note immediately.

**Ownership:** [Claude] code + audit; [Founder] multi-vet verification (may need test accounts).

**Estimated effort:** 3-4 hours.

---

### **DISCUSSION GATE D-2 — Customer notifications strategy**

**Pause execution. Approve before Batch 9.**

**Question:** Replace customer NotificationBell polling with Supabase Realtime, or keep polling with a longer interval?

**Context:** After F-01 (Vercel region fix), each poll drops from 1.4s to ~150ms. So polling becomes acceptable. But Capacitor mobile build will run polling continuously, draining battery.

**Options:**

**A. Replace with Supabase Realtime broadcast.** Server publishes a broadcast event when a notification is created. Bell subscribes on mount. Initial unread count fetched once.
- Pros: True realtime. Minimal battery impact (one persistent socket vs many polls).
- Cons: Needs server-side broadcast call in the notification creation path. Subscription state management. Reconnection handling.
- Effort: 4-6 hours.

**B. Increase poll interval to 90 seconds.**
- Pros: Trivial change. Reduces poll frequency 3x.
- Cons: Notifications can be up to 90s late. Battery still drains.
- Effort: 5 minutes.

**C. Adaptive polling: 30s when tab visible, 5 minutes when tab hidden.**
- Pros: Balances responsiveness and battery.
- Cons: Page Visibility API can be flaky in Capacitor webviews.
- Effort: 1 hour.

**D. Defer this fix until Capacitor wrap.** Keep current 30s polling, address battery during Capacitor stage.
- Pros: Don't over-engineer for hypothetical Capacitor problems.
- Cons: Adds a gotcha to the Capacitor stage.

**Recommendation:** **A** — solve it now, properly, since it'll need to be done anyway for the Capacitor app and the change is contained to one component + one server-side call.

**Decision needed before Batch 9 begins.**

---

### Batch 9 — Notification system migration

**Findings addressed:** F-07

**Scope (assuming Option A from D-2):**
- Modify `src/components/ui/NotificationBell/NotificationBell.tsx` to subscribe to a Supabase Realtime broadcast channel `customer:${userId}:notifications`.
- Add server-side broadcast call in `src/app/api/notifications/route.ts` (POST handler that creates a notification) and any other server code that creates a notification row.
- Remove the `setInterval` polling logic.
- Keep the initial fetch on mount for the unread count.

**Files modified:**
- `src/components/ui/NotificationBell/NotificationBell.tsx`
- `src/app/api/notifications/route.ts`
- Any other server-side notification creators (audit needed: search for `from('notifications').insert`).

**Risk level:** **MEDIUM-HIGH** (notification reliability is user-facing).

**Risk analysis:**
- WebSocket disconnections drop notifications until reconnect. Mitigation: refetch unread count on reconnect.
- Server-side broadcasts must be authenticated correctly. Use `supabaseAdmin` client to send.
- Migration risk: if server doesn't broadcast, bell never updates. Mitigation: keep a fallback poll at very long interval (5 min) as safety net.
- DB row insert + broadcast must be atomic-ish. If broadcast fails, the bell won't know about the notification until next poll/refresh. Acceptable.

**Rollback approach:** `git revert` reinstates polling. Server-side broadcast calls become no-ops.

**Verification steps:**
1. Open customer dashboard. Open dev console. Trigger a server-side notification creation (e.g., via admin or test endpoint). Bell should update within 1 second.
2. Disconnect WiFi for 30 seconds. Reconnect. Bell should refetch and show correct count.
3. DB report 24 hours after deploy: `notifications` polling query count should drop dramatically (currently 176k/week).

**Ownership:** [Claude] code; [Founder] notification flow verification.

**Estimated effort:** 4-6 hours.

---

### **DISCUSSION GATE D-3 — Vet portal Realtime channel topology**

**Pause execution. Approve before Batch 10.**

**Question:** How should we consolidate the 4-6 simultaneous Realtime channels per logged-in vet?

**Options:**

**A. Single channel per vet with all events.**
- Pros: Simplest topology. One subscription, one teardown.
- Cons: Client-side dispatcher needed to route different event types.

**B. Two channels: one for broadcasts (notifications, queue updates) and one for `postgres_changes` (consultations table).**
- Pros: Clean separation between push events and DB-change events.
- Cons: Still two subscriptions.

**C. Status quo (don't fix).**
- Pros: No risk.
- Cons: Battery drain on Capacitor; DB realtime engine over-active.

**Recommendation:** **A**, gated on F-10 verification. We need to confirm the consolidated channel can carry all event types reliably.

**Decision needed before Batch 10 begins.** This is the highest-risk batch in Stage 1; expect more discussion than other gates.

---

### Batch 10 — Vet Realtime consolidation

**Findings addressed:** F-10

**Scope (assuming Option A from D-3):**
- Refactor `src/hooks/useVetDashboardRealtime.ts` and related hooks/components to subscribe to a single channel `vet:${vetId}` with multiple event filters.
- Server-side: emit all vet-related events to this single channel.
- Remove `useVetNotifications`, `LiveQueuePanel` channel, `TodaySchedulePanel` channel, etc. — replace with consumers of the unified channel.

**Files modified:**
- `src/hooks/useVetDashboardRealtime.ts`
- `src/hooks/useVetNotifications.ts`
- `src/components/layouts/VetLayout/VetLayout.tsx`
- `src/components/vet/LiveQueuePanel.tsx`
- `src/components/vet/TodaySchedulePanel.tsx`
- Server-side: `src/app/api/consultations/book/route.ts` and any other endpoints emitting to vet channels.

**Risk level:** **HIGH** (vet workflow critical; misrouted events break vet UX).

**Risk analysis:**
- A vet who's mid-consultation must not miss a notification or lose a queue update.
- Bug in event filtering = silently dropped events. Hard to detect without explicit testing.
- Consolidation often requires refactoring how server-side code emits events. Migration risk to the publish path.

**Mitigation:**
- Add explicit logging on every channel subscription and every received event during rollout.
- Keep old channels alive for one week in parallel (subscribe to both, dedupe events client-side) before removing.
- Run regression test: book a consultation as customer, verify vet sees it appear in queue, see notification, see schedule update. All of those should still happen.

**Rollback approach:** `git revert` plus careful inspection of server-side broadcast paths to ensure no events are lost during the rollback.

**Verification steps:**
1. Manual: full vet workflow regression. Book a consultation from customer side, verify everything updates on the vet side as expected.
2. Network tab: confirm only one or two persistent WebSocket connections per vet (currently 4-6).
3. DB report 7 days after deploy: `realtime.list_changes` call volume should drop by 50%+.

**Ownership:** [Claude] code + audit; [Founder] full vet workflow testing (likely needs collaborator with vet account).

**Estimated effort:** 6-8 hours including parallel-rollout safety period.

---

### Batch 11 — Investigations (no code yet)

**Findings addressed:** F-13, F-11

**Scope:**
- F-13: Investigate why `profiles.role` JWT propagation isn't fully working. Read the middleware fallback path, check Supabase admin permissions, test with a fresh user. Document findings in audit report.
- F-11: Identify what triggers the 385ms `pg_timezone_names` query. Search server-side code, check PostgREST initialization, check date-formatting paths.

**Output:** Updates to `PERFORMANCE_AUDIT.md` with investigation findings. Possibly leads to follow-up fix batches if root cause is clear.

**Risk level:** **NONE** (investigation only).

**Ownership:** [Claude].

**Estimated effort:** 1-2 hours.

---

### Batch 12 — Final review and merge

**Scope:**
- Run full `npm run typecheck && npm run lint && npm run build` from a clean state.
- Manual smoke test of all key pages on the perf branch:
  - Customer: dashboard, pets list, pet detail, consultations list, consultation detail, connect, care-plans, profile.
  - Vet: dashboard, schedule, queue, patient detail, consultation detail.
  - Admin: dashboard, users, vets, consultations.
- Capture informal "after" DevTools snapshot on customer dashboard (compare to "before" from pre-flight).
- Update Stage 1 status section in `PERFORMANCE_AUDIT.md` with results.
- Open PR for `perf/audit-fixes` → `main`.
- After PR merge, monitor Sentry for 48 hours for regression.

**Risk level:** **N/A** (just verification).

**Ownership:** [Claude] verification + PR; [Founder] approval to merge + monitoring.

**Estimated effort:** 2-3 hours.

---

## Aggregate plan summary

| Batch | Findings | Risk | Discussion gate? | Effort |
|---|---|---|---|---|
| 1. Config tweaks | F-02, F-01 file, F-18, F-05 | LOW | No | 30 min + 24h obs |
| 2. Public route exclusion | F-16 | LOW | No | 20 min |
| 3. Parallelize queries | F-14 | MED | No | 90 min |
| 4. Link prefetch dedup | F-08, F-09 | LOW | No | 30 min |
| 5. Column whitelisting | F-19 | LOW | No | 30 min |
| **D-1** | — | — | **Yes** | 15 min |
| 6. Auth helper | F-04 | MED-HIGH | No (post-D-1) | 2 hr |
| **D-5** | — | — | **Yes** | 15 min |
| 7. Image optimization | F-17 | MED | No (post-D-5) | 4-5 hr |
| **D-4** | — | — | **Yes** | 30 min |
| 8. ISR migration | F-15 | MED | No (post-D-4) | 3-4 hr |
| **D-2** | — | — | **Yes** | 15 min |
| 9. Notifications | F-07 | MED-HIGH | No (post-D-2) | 4-6 hr |
| **D-3** | — | — | **Yes** | 30 min |
| 10. Vet Realtime | F-10 | HIGH | No (post-D-3) | 6-8 hr |
| 11. Investigations | F-13, F-11 | NONE | No | 1-2 hr |
| 12. Final review | All | N/A | Yes (merge gate) | 2-3 hr |

**Total estimated coding effort:** 25-35 hours.
**Total elapsed time:** 1-2 weeks depending on discussion turnaround.

---

## Approval mechanism

Approve this plan to begin Batch 1. After each discussion gate (D-1, D-5, D-4, D-2, D-3) we pause for the focused conversation. After Batch 12, we have a Stage 1 → Stage 2 gate review before any production environment work begins.

If you want changes to the plan (different ordering, additional batches, different risk thresholds), tell me before approving and I'll revise.
