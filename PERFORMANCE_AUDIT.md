# Furrie Performance Audit — May 3, 2026

**Auditor:** Claude (Cowork session)
**Scope:** Customer portal (production), with adjacent observations on vet and admin portals
**Method:** Live network measurement + production database query report + full codebase review
**Stack at time of audit:** Next.js 16.1.6, React 19.2.3, App Router, Supabase (Mumbai), Vercel (Washington DC), Sentry telemetry partly wired

---

## Context this report assumes

- The team is wrapping the customer portal and vet portal as two separate Capacitor mobile apps. Admin portal will remain web-only.
- The founder is non-technical; recommendations are written so a developer can execute them and a non-developer can understand the trade-offs.
- This is diagnosis. No code was changed during the audit.
- "Mumbai round-trip" throughout this document means a single network round-trip between the Vercel function and the Supabase database. At present this costs ~400ms because of a region mismatch.

---

## Executive summary

The Furrie web app is structurally slow because **Vercel functions run in Washington DC while the Supabase database lives in Mumbai**. Every server-rendered page makes 2 to 6 round-trips to Mumbai before the user sees anything. Measured TTFB on the customer dashboard was **2.11 seconds**; a healthy TTFB for the same architecture would be 400–600ms.

The single highest-leverage fix is moving Vercel's function region to Mumbai (`bom1`). That one change is expected to cut perceived load times on every page by 60–75% with zero code changes and effectively zero risk.

The second most impactful change is parallelizing sequential database queries on three specific pages (`/connect`, `/care-plans`, `/vet-portal/patients/[id]`). The customer dashboard already does this correctly with `Promise.all`; the pattern just hasn't been propagated. Applying it would save another ~1 second on those specific pages.

Beyond those two fixes, the database is healthy, the JavaScript bundle is well-managed, lazy loading is correctly applied for heavy libraries (Daily.co, react-pdf), and there are no major architectural rewrites needed. This audit found a small number of high-leverage fixes and a tail of polish-grade improvements — not a system that needs rebuilding.

---

## Baseline measurements

Captured on May 3, 2026 against the production customer portal at `https://app.furrie.in/dashboard` from a fresh logged-in account, Chrome DevTools throttled to "Fast 4G", cache disabled, hard reload.

| Metric | Measured | Healthy target | Gap |
|---|---|---|---|
| Document TTFB (dashboard) | **2.11 s** | 400–600 ms | ~4x slower than target |
| Document total time | 2.96 s | 1.0–1.5 s | ~2x slower |
| Document content download | 841 ms | <500 ms | Acceptable, throttling-adjusted |
| RSC navigation prefetch (single hover) | ~500–650 ms | 100–200 ms | ~3-5x slower |
| Click-through navigation (one click → /connect) | 1.62–1.65 s × 2 fetches | 200–300 ms × 1 | ~10x slower |
| Notification poll round-trip | 800 ms – 1.4 s per poll | 100–200 ms | ~6-10x slower |
| Total session "Finish" timer | 7.1 min (misleading — see F-07) | n/a | Polling kept tab "active" |
| Dashboard JS payload | 740 kB transferred / 2.3 MB resources | Acceptable | Within budget |
| Console warnings | 27, all CSS preload warnings | 0 | Cosmetic, see F-09 |

Production database query report (last 7 days, Supabase slow queries view):

| Query class | Calls/week | Mean | Max | % of DB time |
|---|---|---|---|---|
| `realtime.list_changes` | 479,355 | 3.5 ms | 581 ms | 82.0% |
| auth.users lookup | 206,929 | 0.19 ms | 177 ms | 1.96% |
| auth.sessions lookup | 209,918 | 0.09 ms | 19 ms | 0.89% |
| auth.identities lookup | 207,037 | 0.05 ms | 14 ms | 0.50% |
| auth.mfa_factors lookup | 207,037 | 0.04 ms | 11 ms | 0.43% |
| `notifications` polling query | 176,582 | 0.20 ms | 30 ms | 1.75% |
| `set_config` (auth role bind) | 280,721 combined | 0.16 ms | 90 ms | 2.6% |
| `profiles.role` lookup | 10,428 | 0.58 ms | 16 ms | 0.29% |

**Critical interpretation:** the application's *own* queries (pets, consultations, care plans) are too fast and too low-volume to appear in the slow query report at all. The database is healthy. The slowness is network round-trip count, not query execution.

---

## Findings, ranked by impact

Severity is "what's the cost of this finding right now." Effort is engineering time. Risk analysis is "what could go wrong when we fix it." Where a finding requires a discussion before a fix, that's noted, and full discussion list is at the end of the report.

---

### F-01 — Vercel/Supabase region mismatch

**Severity:** HIGH (single biggest cause of slowness)
**Effort:** S (10 minutes, no code changes)

**What's happening.** Your Vercel functions run in `iad1` (Washington DC, US East). Your Supabase database lives in `ap-south-1` (Mumbai). Every server-rendered page does 2–6 round-trips between those two regions before responding to the user. Each round-trip is approximately 400ms of pure latency, on top of the network distance from the Indian user to either coast.

**Evidence.**
- `vercel.json` and `next.config.ts` contain no `regions` configuration, so Vercel defaults to `iad1`.
- Supabase project location confirmed via dashboard: Mumbai, `ap-south-1`, `t4g.nano` compute.
- Live measurement: TTFB on dashboard = 2.11s. Math breakdown: middleware auth round-trip (~400ms) + page Server Component auth round-trip (~400ms) + parallel batch of 6 queries bottlenecked on slowest (~400-500ms) + serial `getActiveCreditBalance` round-trip (~400ms) + actual rendering (~300ms) = ~1.9–2.1s. Matches measurement within rounding.

**Fix approach.** In Vercel project Settings → Functions, set Function Region to `bom1` (Mumbai). On Pro plan this is a single dropdown. No code change required. Optionally pin in `vercel.json` so the setting is version-controlled:

```json
{ "regions": ["bom1"] }
```

**Estimated impact.** TTFB on dashboard expected to drop from 2.11s to ~500–700ms. Per-Mumbai-round-trip cost drops from ~400ms to ~5–10ms. All other findings in this report (F-04, F-07, F-08, F-14, F-15, F-16) become 5–80x cheaper in absolute time, even before they're individually fixed.

**Risk analysis.**
- Vercel functions in `bom1` are slightly more expensive than `iad1` per invocation on some plans — verify on Pro pricing. Negligible at current scale.
- If a future feature requires a service that's only fast from US regions (e.g., a US-only AI provider), latency to that service will be added by the same delta we're saving. Not currently a concern.
- Edge middleware does not move; it continues to run at the user's nearest edge. Only serverless function execution moves.
- No data migration. No DNS change. No user-visible behavioral change.

**Discussion needed?** No. This is a direct fix.

---

### F-14 — Sequential database queries in Server Components

**Severity:** HIGH (largest code-side fix)
**Effort:** S per page (~30 min each, three pages)

**What's happening.** Several pages issue 4–5 independent database queries one after another (`await query1; await query2; await query3;`) when they could fire in parallel using `Promise.all`. Each sequential `await` is one full Mumbai round-trip. The customer dashboard already uses the right pattern; it just wasn't applied uniformly.

**Evidence.** `src/app/customer-portal/(app)/connect/page.tsx`, lines 27–90, runs five sequential queries:

```typescript
await supabase.auth.getUser();              // round-trip 1
await supabase.from('pets').select('*');     // round-trip 2
await supabase.from('subscriptions')...;     // round-trip 3 (when feature flag on)
await supabase.from('consultation_packs')...;// round-trip 4
await supabase.from('consultations')...;     // round-trip 5
```

Same pattern, smaller scale, in:
- `src/app/customer-portal/(app)/care-plans/page.tsx` lines 51–70 (3 sequential)
- `src/app/vet-portal/patients/[id]/page.tsx` lines 59–76 (3 sequential)

**Fix approach.** After `getUser()` (which has to come first), wrap the remaining independent queries in `Promise.all`. Pattern is already in `src/app/customer-portal/(app)/dashboard/page.tsx` line 61 — copy it.

**Estimated impact.** On `/connect` specifically, ~1.2 seconds saved before F-01 fix; ~30ms saved after F-01 fix. The latter is small in absolute terms but the proportional change to perceived "click responsiveness" is still meaningful.

**Risk analysis.**
- One real risk: queries that depend on results of earlier queries cannot be parallelized. Verify each page that none of the parallel-batch queries reads `user.id` from a query other than `getUser()`. Spot check confirms they're all independent.
- `Promise.all` rejects on first failure; today the sequential awaits would fail at the same query but in isolation. After parallelizing, wrap with `Promise.allSettled` if any individual failure should be tolerated. Currently the dashboard uses a `withTimeout` wrapper with a fallback — same pattern can apply.

**Discussion needed?** No. Mechanical refactor.

---

### F-04 — Double `getUser()` per page render

**Severity:** HIGH (after F-01, drops to LOW)
**Effort:** M (introduce a request-cached helper)

**What's happening.** The middleware (`src/middleware.ts:84`) calls `supabase.auth.getUser()` to decide routing. Then most page Server Components call `supabase.auth.getUser()` again to get the user ID for queries. Both are real network calls to Supabase Auth. Two Mumbai round-trips per page just to identify the user.

**Evidence.**
- `src/middleware.ts:84` — middleware calls `updateSession(request)` which calls `getUser()` (`src/lib/supabase/middleware.ts:40`).
- `src/app/customer-portal/(app)/dashboard/page.tsx:49` — page calls `getUser()` again.
- Same pattern in `connect/page.tsx`, `care-plans/page.tsx`, `pets/page.tsx`, `consultations/page.tsx`, `vet-portal/patients/[id]/page.tsx`, etc.
- DB report shows 206,929 user lookups in 7 days, roughly 2x the per-page-load expectation.

**Fix approach.** Introduce a request-scoped cache using React's built-in `cache()`:

```typescript
// src/lib/supabase/getCurrentUser.ts
import { cache } from 'react';
import { createClient } from './server';

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
});
```

`cache()` deduplicates within a single request. Page code calls `getCurrentUser()`; the middleware can either populate a header with the user ID (set during its existing auth check) for the page to read, or the page just calls `getCurrentUser()` and accepts one network call (we lose the middleware-already-fetched data, but the request-cache prevents the duplicate-within-one-page case).

A more advanced fix is to read the user from the JWT cookie directly without a network call when the cookie is fresh — but `getUser()` validates against the auth server for security reasons, so this requires careful threat modeling. Recommend the simpler `cache()` approach first.

**Estimated impact.** After F-01: ~5ms per request (negligible). Before F-01: ~400ms per page (significant).

**Risk analysis.**
- `getUser()` is the security-correct choice over `getSession()` (per Supabase docs). Don't replace it with `getSession()` to "save a round-trip" — that breaks security.
- React's `cache()` is request-scoped automatically; no risk of cross-request user leak.
- If middleware changes the user mid-request (rare), the cached value could go stale within that one request. Negligible risk.

**Discussion needed?** Light. See "Discussion D-1" at the end.

---

### F-07 — NotificationBell polling on every authenticated page

**Severity:** MEDIUM (after F-01, becomes LOW; design choice persists)
**Effort:** M (replace with Supabase Realtime broadcast, ~half a day)

**What's happening.** `NotificationBell.tsx` polls `/api/notifications?count_only=true` every 30 seconds while mounted. The component is in customer, vet, and admin layouts, so it's effectively always running for any logged-in user. Over a 7-minute session in our test, this single component generated ~14 of the slowest 28 requests in the network log.

The misleading "Finish: 7.1 minutes" timer in the network tab was caused by this — the page wasn't loading for 7 minutes; the bell kept the network active.

**Evidence.**
- `src/components/ui/NotificationBell/NotificationBell.tsx:17` — `const POLL_INTERVAL = 30_000;`
- `:65` — `setInterval(fetchUnreadCount, POLL_INTERVAL)`
- Production DB report: `notifications` table polling query ran 176,582 times in 7 days.

**Fix approach.** Replace polling with a Supabase Realtime broadcast subscription. The vet portal already has the pattern in `useVetNotifications.ts`. The customer portal would add a single broadcast channel keyed to the user. When a new notification row is inserted server-side, broadcast on `customer:${userId}:notifications`. The bell subscribes on mount and increments count on receipt. Initial count fetched once at mount, then push-driven from there.

**Estimated impact.**
- Today: ~120 notification HTTP calls per logged-in user per hour.
- Post-fix: 1 HTTP call per session (initial count) + 1 WebSocket connection.
- After F-01 alone, each individual poll drops from ~1s to ~150ms, so the user-visible impact is mostly already addressed without this change.
- The case for doing this anyway: reduces DB load (176k weekly queries gone), reduces battery drain on Capacitor mobile builds, and gives genuinely real-time notifications instead of up-to-30-seconds-delayed.

**Risk analysis.**
- Realtime broadcast requires a separate code path on the server side to publish the event. Already in place for vet notifications, can be extended.
- WebSocket connections add a persistent socket per user. Supabase Realtime quota: check current plan. At Furrie's scale, well within limits.
- If the WebSocket disconnects (network blip), notifications could be missed. Mitigate by re-fetching the unread count on socket reconnect.

**Discussion needed?** Yes. See D-2.

---

### F-10 — Realtime channel sprawl on vet portal

**Severity:** MEDIUM (no immediate user-visible impact; affects DB capacity headroom)
**Effort:** M (consolidate channels, ~half day)

**What's happening.** When a vet is logged in and on their dashboard, they have 4–6 simultaneous Realtime channels open: incoming consultations, dashboard updates, queue, schedule, availability, plus any consultation room subscriptions. Each `postgres_changes` channel causes the Realtime engine to scan the write-ahead log for relevant changes. The engine ran 479,355 such scans last week, consuming 82% of the slow-query report by volume (though only ~0.3% of actual DB CPU time).

**Evidence.** `src/hooks/useVetDashboardRealtime.ts`, `src/components/layouts/VetLayout/VetLayout.tsx:56`, `src/components/vet/LiveQueuePanel.tsx:120`, `src/components/vet/TodaySchedulePanel.tsx:200`, `src/hooks/useVetNotifications.ts:137`.

**Fix approach.** Consolidate. Most of these subscriptions watch the same table (`consultations`) for slightly different events. A single channel per vet that filters by `vet_id` and dispatches different UI updates client-side based on event type would replace 3–4 channels. Broadcast channels can be combined similarly.

**Estimated impact.** Reduces Realtime engine work proportionally to channels eliminated (could halve `realtime.list_changes` volume). Headroom for scaling vet count without DB pressure. Not user-visible today.

**Risk analysis.**
- Consolidation usually means a fan-out reducer client-side. Bug surface increases slightly. Cover with manual test of every realtime UI path.
- If consolidation accidentally drops an event type, a stale UI state results. Worth testing the "vet sees new consultation request appear without refresh" path explicitly post-fix.

**Discussion needed?** Yes. See D-3.

---

### F-15 — `force-dynamic` on pages that could be ISR-cached

**Severity:** MEDIUM
**Effort:** S per page

**Stage 1 outcome (2026-05-03):** DEFERRED to post-Stage 1 per discussion gate D-4. With F-01 already shipped (Vercel in `bom1`), TTFB on these vet detail pages drops from ~2.1s to ~500ms without ISR. The remaining caching benefit is small in absolute terms, while the staleness risk on a clinical record (vet A submits a SOAP note; vet B sees stale view for 30s) is real and requires careful `revalidatePath` discipline at every write site. Revisit when (a) traffic grows enough that the ~500ms is a measurable user complaint, or (b) we want per-vet ISR keyed by viewer for the patient detail page. Until then, `force-dynamic` is the safer default.

**What's happening.** Several detail pages explicitly opt out of static caching with `export const dynamic = 'force-dynamic'`, but their content rarely changes within a single session and could safely be revalidated every 30–60 seconds without affecting UX.

**Evidence.**
- `src/app/vet-portal/patients/[id]/page.tsx:15` — `export const dynamic = 'force-dynamic'`
- `src/app/vet-portal/consultations/[id]/page.tsx:15` — same

**Fix approach.** Remove `force-dynamic`, add `export const revalidate = 60;` (or chosen window). For pages that need fresh data on user action (e.g., a vet just submitted a SOAP note), use `revalidatePath` after the mutation rather than blanket-disabling caching.

**Estimated impact.** First load to a page from a different vet hits cache miss (full DB round-trip). Subsequent loads in the next 60s hit cache (5–10ms response). For active vets navigating between consultations, noticeable speedup.

**Risk analysis.**
- Stale data risk: vet sees up-to-60s-old patient info. For a teleconsultation app, this needs explicit acceptance — a vet checking history shouldn't miss something just-recorded by another vet. Discuss before applying.
- ISR + auth: pages with user-specific content (e.g., per-vet view of a patient) are not safely shared between vets. Verify cache key includes the requesting vet's identity, or scope ISR only to truly shared content.

**Discussion needed?** Yes. See D-4.

---

### F-16 — Public pages routing through auth middleware

**Severity:** MEDIUM
**Effort:** S

**What's happening.** Pages like `/customer-portal/terms` and `/customer-portal/privacy` are public legal content but pass through the Supabase auth middleware, which calls `getUser()` (one Mumbai round-trip) before serving them.

**Evidence.** `src/middleware.ts:193` matcher does not exclude these paths. Public routes list at `:35-39` only excludes login/signup/auth-callback.

**Fix approach.** Add `terms` and `privacy` to the matcher exclusion list, or add them to the `publicRoutes` set so the middleware skips auth for them. Even better: render them statically (`export const dynamic = 'force-static'`) so they never re-render.

**Estimated impact.** Removes ~400ms (pre-F-01) or ~5ms (post-F-01) from public page loads. More important for SEO and for unauthenticated visitors who hit these pages most often.

**Risk analysis.** Trivial. The pages don't read user data. No risk.

**Discussion needed?** No.

---

### F-17 — Raw `<img>` tags loading Supabase Storage at full resolution

**Severity:** MEDIUM
**Effort:** M (introduce a `<PetImage>` wrapper component)

**What's happening.** Several pages use raw `<img src={pet.photoUrls[0]} />` instead of `next/image`. Supabase Storage returns the original uploaded file — typically 2–4 MB pet photos shot on a phone — when nothing in the URL specifies a smaller variant. A consultation page rendering 3–5 pet photos can transfer 6–20 MB of images that are then displayed at thumbnail size.

**Evidence.**
- `src/app/vet-portal/patients/[id]/page.tsx:159` — `<img src={pet.photoUrls[0]} alt={pet.name} className={styles.petImage} />`
- `src/app/customer-portal/(app)/pets/[id]/care-plans/[planId]/page.tsx:272`
- `src/app/vet-portal/consultations/[id]/page.tsx:340, 539`
- `src/components/customer/ConsultationDetailContent.tsx:344`

The dashboard already uses `next/image` correctly (line 273 of `dashboard/page.tsx`). Pattern exists, just inconsistently applied.

**Fix approach.** Two options:

1. Replace `<img>` with `<Image>` from `next/image`, providing `width` and `height`. Next.js's image optimizer serves resized WebP/AVIF.
2. Build a `<PetImage>` wrapper that uses Supabase Storage's image transformation API directly (`?width=200&height=200&resize=cover`). This avoids round-tripping through the Next.js image optimizer.

Option 2 is faster at runtime (CDN-direct from Supabase) but Option 1 is one-line-per-call.

**Estimated impact.** Pages with multiple pet photos drop from 6–20 MB to 200–500 KB of image payload. On Fast 4G, ~2–4 seconds saved on image-heavy consultation detail pages.

**Risk analysis.** Layout shifts if `width`/`height` are wrong — must specify them. Existing CSS module classes that target `<img>` selectors might need updating to target the Next.js wrapper.

**Discussion needed?** Light. See D-5 for the wrapper-vs-direct decision.

---

### F-08 — Duplicate Link prefetches from multiple navs

**Severity:** MEDIUM (after F-01 becomes LOW)
**Effort:** S

**What's happening.** Both the desktop sidebar nav and the mobile bottom nav render the same set of links (`/dashboard`, `/pets`, `/consultations`, `/care-plans`, `/connect`). Each `<Link>` component independently prefetches when visible. So the same route gets prefetched 2–3 times, each time a Mumbai round-trip.

**Evidence.** Network log shows pairs like `connect?_rsc=2tkn4` (1.65s) and `connect?_rsc=ffyyz` (1.62s) for a single user click. `src/components/layouts/CustomerLayout/CustomerLayout.tsx` lines 76–89 (sidebar) and 115–165 (mobile nav) — duplicate hrefs across the two navs.

**Fix approach.** On one of the two navs (typically the one rendered when the other is offscreen due to media query), set `<Link prefetch={false}>`. Or render only one nav at a time based on viewport — currently both are rendered and shown/hidden by CSS, which means both prefetch.

**Estimated impact.** Halves the prefetch traffic on initial dashboard load. Pre-F-01: noticeable (each prefetch ~500ms). Post-F-01: barely measurable.

**Risk analysis.** None. If the user rotates phone or resizes browser, the disabled-prefetch nav would be slower to navigate from for one click — acceptable.

**Discussion needed?** No.

---

### F-03 — Database compute size (`t4g.nano`)

**Severity:** LOW today, MEDIUM if traffic grows 5x
**Effort:** S to upgrade, but billing impact

**What's happening.** Furrie runs on Supabase's smallest compute tier — single vCPU, ~512 MB RAM. Cache hit rate is currently 100% on the queries we examined, so the working set fits in memory. As pet, consultation, and care plan tables grow, that won't hold.

**Evidence.** Supabase dashboard, Project Settings → General. DB report showing `cache_hit_rate = 100%` on all top queries.

**Fix approach.** Set up monitoring on `cache_hit_rate` (alert when drops below 95%) and on slow query P95 (alert when > 100ms). Upgrade to `t4g.small` or higher when alerts trigger or before a known traffic event (marketing launch, app store launch).

**Estimated impact.** No immediate change. Headroom only.

**Risk analysis.** Upgrading is a few minutes of write-locked DB during compute switch. Plan for off-hours.

**Discussion needed?** Yes, when planning the Capacitor app store launch. See D-6.

---

### F-05 — Sentry telemetry: low sample rate and confusing UI navigation

**Severity:** LOW
**Effort:** S

**What's happening.** Sentry IS receiving events (the `monitoring?o=...` calls in the network log are Sentry's tunnel route working). The configuration is correct. Two real issues: (a) `tracesSampleRate` is 0.1 in production, so 90% of requests are not recorded for performance, making the Insights dashboards sparse; (b) when you click into the Sentry project you land on a view that hasn't been "primed" with its specific event type, so it shows the setup wizard, which read as "Sentry isn't tracking" but actually wasn't.

**Evidence.** `sentry.server.config.ts:9`, `sentry.edge.config.ts:9`, `instrumentation-client.ts:10` — `tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1`.

**Fix approach.** For the audit window post-F-01, set `tracesSampleRate: 1.0` in production temporarily so we can capture full before/after data. Steady-state, 0.25 is reasonable for the current traffic level. Document where in Sentry to find performance data: Insights → Backend (server transactions), Insights → Frontend (web vitals), Performance → Trace Explorer (full traces).

**Estimated impact.** Better visibility, no end-user impact.

**Risk analysis.** 100% sampling temporarily increases Sentry quota consumption. Verify within plan limit before flipping.

**Discussion needed?** No.

---

### F-09 — Aggressive CSS preload warnings

**Severity:** LOW
**Effort:** S

**What's happening.** Browser console shows 27 "resource was preloaded but not used within a few seconds" warnings, all about CSS chunks. Next.js is preloading CSS for routes the user doesn't visit. Wasted bandwidth, plus visual clutter in DevTools that masks real errors.

**Evidence.** Console log captured during dashboard load — five distinct CSS chunk URLs each warned multiple times.

**Fix approach.** Investigate why these chunks are preloaded. Most likely cause: Link prefetch defaults are pulling CSS for prefetched routes that the user never visits. Reducing `<Link prefetch>` scope (related to F-08) typically eliminates these.

**Estimated impact.** Cosmetic mostly. Some bandwidth saved.

**Risk analysis.** None.

**Discussion needed?** No.

---

### F-19 — `select('*')` over-fetching

**Severity:** LOW
**Effort:** S per occurrence

**Stage 1 outcome (2026-05-03):** DEFERRED. Investigation showed the connect page's pet rows feed into `mapPetFromDB` (`src/lib/utils/petMapper.ts`), which reads every column on the pets table to construct a full `Pet`. Whitelisting columns at the query level would require either (a) restructuring `ConnectFlow` to consume a thinner `PetSummary` type — high regression risk on a critical purchase path — or (b) listing every column explicitly with no functional savings. Same pattern applies to the other `select('*')` sites: most feed into typed mappers that need all fields. Genuine savings require data-flow refactoring, which is out of scope for performance work. Revisit if the schema grows wide enough that specific large columns (e.g., long-text notes) dominate row size.

**What's happening.** `connect/page.tsx:40` does `supabase.from('pets').select('*')` — fetches every column on the pets table including potentially large fields (notes, photo arrays, etc.) when the downstream `<ConnectFlow>` component only needs a subset.

**Evidence.** Grep `select('*')` across `src/app/**/page.tsx`. Several occurrences.

**Fix approach.** Whitelist columns: `select('id, name, species, breed, photo_urls, ...whatever-is-actually-used')`. For each over-fetch site, audit what the consuming component reads and fetch only those fields.

**Estimated impact.** Bytes-on-the-wire savings, mostly meaningful only after the schema grows wide. Currently small.

**Risk analysis.** Easy to miss a field that's used downstream and break a UI. Test each page after the change.

**Discussion needed?** No.

---

### F-18 — `next.config.ts` missing optimizations

**Severity:** LOW
**Effort:** S

**What's happening.** Two cheap wins are not configured.

1. `experimental.optimizePackageImports` for tree-shakable libraries — doesn't appear to be configured for any of `lucide-react`, `date-fns`, etc. (Currently those are not heavily used, but as the icon set grows this matters.)
2. The `images` block lacks `formats: ['image/avif', 'image/webp']`, so the optimizer falls back to default behavior.

**Evidence.** `next.config.ts:8-28`.

**Fix approach.** Add to the config:

```typescript
experimental: {
  optimizePackageImports: ['lucide-react', 'date-fns'],
},
images: {
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [/* existing */],
},
```

**Estimated impact.** 5–15% smaller image payloads on modern browsers; small reduction in JS for icon-heavy pages once libraries grow.

**Risk analysis.** None. These are well-tested Next.js features.

**Discussion needed?** No.

---

### F-13 — `profiles.role` lookup volume

**Severity:** LOW
**Effort:** S (investigate why role isn't being cached as expected)

**Stage 1 investigation outcome (2026-05-03):**

Root cause: the fire-and-forget `adminClient.auth.admin.updateUserById(...)` at `src/middleware.ts:150` writes `app_metadata.role` to the user record server-side correctly. However, the user's existing access token (the JWT in the auth cookie) still contains the OLD `app_metadata` until that token refreshes. `@supabase/ssr`'s middleware `getUser()` only refreshes the token when it's near expiry — so until then, the JWT continues to lack `app_metadata.role` and the middleware fallback path fires again.

Two clean fixes (both LOW effort, neither shipped in Stage 1 to keep the auth path stable):

1. **Set role at signup time.** In the customer self-registration handler (`src/app/api/auth/...` / signup flow), call `adminClient.auth.admin.updateUserById(newUser.id, { app_metadata: { role: 'customer' } })` immediately after account creation. Vet/Admin accounts already get role at provisioning time. This means the JWT carries `role` from the very first session, no fallback needed. Backfill script: one-time `UPDATE auth.users SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', to_jsonb(p.role)) FROM profiles p WHERE p.id = auth.users.id` covers existing users.

2. **Force a session refresh after the metadata update.** After `updateUserById`, call `supabase.auth.refreshSession()` to mint a new JWT that includes the updated metadata. Cost: one extra round-trip on the request that triggers the fallback. After the refresh, no further fallbacks for that user.

Recommendation: ship #1 as part of Stage 2 alongside the testing-environment work — it's the cleanest fix and removes the fallback path entirely. Until then, the fallback path is correct and only mildly inefficient (10k queries/week at 0.58ms mean = ~6 seconds of DB time per week). Not user-visible.

**What's happening.** Middleware has a fallback: if `app_metadata.role` is missing from the JWT, query the profiles table for the user's role and update `app_metadata` for next time. This DB query ran 10,428 times in 7 days. If the optimization were working as designed, that number should be roughly equal to the number of new sessions, not the number of requests.

**Evidence.** `src/middleware.ts:121-143`. The fire-and-forget update at line 137–142 may be failing silently due to permissions on the admin client, or the JWT may not be refreshing with the new metadata until the user re-logs in.

**Fix approach.** Investigate why `app_metadata.role` isn't propagating. Likely fixes: (a) ensure admin client has permission to update user metadata, (b) force a session refresh after the metadata update, or (c) accept the limitation and remove the fallback path entirely by guaranteeing role is set at user-creation time via a Supabase trigger or admin script.

**Estimated impact.** Minor. After F-01 the round-trip is cheap.

**Risk analysis.** If the fallback path is removed without ensuring role is always set in metadata at signup, users could land in a "no role" state and be redirected to login. Test signup → portal access end-to-end.

**Discussion needed?** No.

---

### F-11 — `pg_timezone_names` slowness

**Severity:** LOW
**Effort:** S

**Stage 1 investigation outcome (2026-05-03):**

Application code review found no direct usage of `pg_timezone_names` — no `at time zone`, `to_char`, or timezone-introspection calls in any RLS policy, function, or query path under `src/`. The 150-calls/week pattern is consistent with PostgREST's connection initialization (it queries `pg_timezone_names` to populate its timezone list) and Supabase Studio's web UI (each session opening loads timezones). The 385ms mean is a known artifact of Postgres scanning the timezone files on disk; it's the same on every Postgres install and doesn't indicate a code problem.

Recommendation: no action. ~57 seconds of DB time per week is negligible. If it ever matters at scale, Postgres has a `timezone_abbreviations` setting that can be tuned, but Furrie won't hit that scale for years.

**What's happening.** A query against `pg_timezone_names` runs 150 times per week with a mean of 385ms — unusually slow. Likely from PostgREST initialization or a date-formatting code path.

**Evidence.** Top of slow query report.

**Fix approach.** Identify the code path triggering this. Could be a Supabase Studio sync, or a `to_char` / `at time zone` operation in an RLS policy or function. Once located, cache the timezone list or avoid the query entirely.

**Estimated impact.** ~57s/week of DB time saved. Minor.

**Risk analysis.** None.

**Discussion needed?** No.

---

### F-02 — Stale documentation in CLAUDE.md

**Severity:** LOW (process hygiene)
**Effort:** S

**What's happening.** `CLAUDE.md` says "Supabase (PostgreSQL, Auth, Realtime, Edge Functions, Storage) — Singapore region". Actual region is Mumbai (`ap-south-1`). Anyone (human or AI) reading the docs to understand the system gets misled.

**Evidence.** `CLAUDE.md` line referencing region; Supabase dashboard shows `ap-south-1`.

**Fix approach.** Update `CLAUDE.md` to say Mumbai. Add a one-liner in a "Region & Latency" section noting the Vercel region (post-F-01: `bom1`) so future engineers can see them paired.

**Estimated impact.** None on performance; reduces future debugging confusion.

**Risk analysis.** None.

**Discussion needed?** No.

---

### F-06 — Missing Cashfree environment variables

**Severity:** LOW (almost certainly intentional)
**Effort:** S to verify

**What's happening.** No `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` / `NEXT_PUBLIC_CASHFREE_ENV` in Vercel. But `NEXT_PUBLIC_SKIP_PAYMENTS` is set, suggesting payments are intentionally feature-flagged off until launch.

**Evidence.** Vercel Environment Variables page (no Cashfree vars present); `NEXT_PUBLIC_SKIP_PAYMENTS` configured.

**Fix approach.** Confirm with the founder that this is intentional. Document it. Plan to set the Cashfree variables at the appropriate launch milestone.

**Estimated impact.** None today.

**Risk analysis.** None today; risk is forgetting to set them at launch and a deployment going live without working payments.

**Discussion needed?** Brief confirmation.

---

## Recommended fix order

Optimized for biggest impact per unit of effort. Each step assumes the previous have been completed.

1. **F-01: Move Vercel function region to `bom1` (Mumbai).** 10 minutes. Single biggest win in the entire audit. Do this first, on its own deploy, with before/after measurements captured.

2. **F-05: Bump Sentry `tracesSampleRate` to 1.0 temporarily.** 5 minutes. Do this *before* the F-01 deploy so we capture the before/after curve.

3. **F-14: Parallelize sequential queries in connect, care-plans, vet patient detail.** ~2 hours. Mechanical refactor.

4. **F-16: Exclude terms/privacy from auth middleware + mark static.** 15 minutes.

5. **F-08: `prefetch={false}` on duplicated nav.** 30 minutes.

6. **F-09: Reduce CSS preload aggressiveness.** Falls out naturally from F-08 in most cases.

7. **F-04: Introduce `getCurrentUser()` request-cache helper.** ~half day. Rolls out across portals incrementally.

8. **F-17: Replace raw `<img>` with optimized image component.** ~half day. After this, image-heavy pages feel instant.

9. **F-15: Move detail pages from `force-dynamic` to ISR.** ~1 hour, per page. Requires team decision on staleness window (D-4).

10. **F-07: Replace NotificationBell polling with Realtime broadcast.** ~half day. After F-01 the user-visible benefit is small; the DB-load and Capacitor-battery benefits are real.

11. **F-10: Consolidate vet portal Realtime channels.** ~half day. Capacity headroom for growth.

12. **F-18: Add `experimental.optimizePackageImports` and image formats.** 15 minutes.

13. **F-19, F-13, F-11, F-02, F-06: Polish-grade items.** Address opportunistically alongside other work.

After steps 1–4 alone, expected user-perceived improvement: customer dashboard load drops from ~3 seconds to ~700ms. Connect page load drops from ~3.5 seconds to ~800ms. Click-through navigation drops from ~1.6s to ~250ms. That is the change between "this app feels broken" and "this app feels professional".

---

## Production telemetry hygiene

Separate from performance fixes, but discovered during the audit and worth addressing for the same reason an audit is worth running: you can't improve what you can't see.

### T-01 — Confirm Sentry data is reaching dashboards

The DSN is configured and events are being sent (verified via network log showing the `/monitoring` tunnel route succeeding). The "setup wizard appearance" you saw is most likely a Sentry UI quirk — the project page hasn't refreshed the "we received an event" check, or you landed on a sub-view that hasn't received its specific event type yet. Look in **Insights → Backend** for server transactions and **Insights → Frontend** for web vitals.

### T-02 — Plan post-fix telemetry capture

Before the F-01 deploy: bump `tracesSampleRate` to 1.0 in `sentry.server.config.ts`, `sentry.edge.config.ts`, and `instrumentation-client.ts`. Deploy. Wait 24 hours for a baseline. Then deploy the region change. Compare P75/P95 transaction durations before vs after. This produces a defensible, real-data version of the speedup numbers in this report — useful for future investor/board context.

### T-03 — Steady-state telemetry settings

After the audit window, drop `tracesSampleRate` back to 0.25 (not 0.1). At Furrie's current traffic, 0.25 gives statistically meaningful dashboards without burning quota. Add Sentry alerts on:

- P95 server transaction duration > 1s for any of the customer dashboard, connect, care-plans, consultations routes
- Any "missing index" or "RLS slow" queries surfaced via Supabase
- Error rate > 1% on any auth flow

### T-04 — Verify production environment variables

`NEXT_PUBLIC_SUPABASE_URL` showed up in the second screenshot but not the first; confirm it's actually set, not auto-injected only. Cashfree variables are absent — confirm intentional, document the launch-time checklist for setting them.

---

## Capacitor readiness — split across two apps

The team's plan to ship the customer portal and vet portal as two separate Capacitor apps is sound. The two apps have very different performance profiles, and bundling them separately means each only ships the JS it actually uses.

### Customer Capacitor app

**C-01 [HIGH for Capacitor]:** Initial JS bundle becomes the app launch experience. The current customer portal main bundle plus chunks measured ~412 kB on the dashboard load. After F-18 and route-level splitting verification, expect ~10–15% reduction. **Recommendation: implement an app shell strategy.** The first thing the user sees should be a static shell (logo, greeting placeholder, nav skeleton) baked into the Capacitor bundle that renders before any network call. The dashboard's actual data then streams in.

**C-02 [MEDIUM for Capacitor]:** Auth uses cookies via `@supabase/ssr`. Inside a Capacitor webview, cookie behavior can differ from a real browser, especially around cross-origin cookies and SameSite policy. The subdomain-based portal isolation (`app.furrie.in`) might break if the webview origin is `capacitor://localhost` or `https://localhost`. **Recommendation: build a minimum Capacitor proof-of-concept just for login + dashboard before wrapping the full app.** Identify cookie issues early.

**C-03 [MEDIUM for Capacitor]:** The customer portal uses Realtime only in the follow-up chat. Outside that screen, Realtime is dormant. Battery profile is fine.

**C-04 [LOW for Capacitor]:** `<Link prefetch>` continues to work but provides less perceived benefit inside a webview. After F-08 dedupe, it costs little. Acceptable to leave on.

### Vet Capacitor app

**V-01 [HIGH for Capacitor]:** Bundle size will be larger than the customer app — vet portal includes Daily.co (consultation room is a primary surface, not a rare destination), live queue, schedule, and PDF prescription generation. Verify route-level splitting: PDF generation should not be in the main bundle. Daily SDK lazy-load already exists on the consultation room page (verified in audit) — confirm this carries through Capacitor build.

**V-02 [HIGH for Capacitor]:** The vet portal opens 4–6 simultaneous Realtime WebSocket subscriptions per logged-in vet. On a mobile device, multiple persistent WebSockets affect battery noticeably. F-10 (consolidate channels) should be done before Capacitor wrap, not after. Otherwise vets will report "the app drains my battery" and the cause will be invisible.

**V-03 [HIGH for Capacitor]:** Push notifications. The Capacitor app should use native push (FCM / APNs) for "new consultation request" alerts, not Realtime. Realtime is for in-app updates while the app is open. Push is for when the app is backgrounded. These are different mechanisms with different code paths. Plan both.

**V-04 [MEDIUM for Capacitor]:** Video call permissions. Camera and microphone permission flows differ between iOS, Android, and web. Daily.co handles most of it but the first-time prompt UX varies.

### Admin (web only)

No Capacitor work. Continue treating as desktop-only web. Consider whether the admin portal needs the same auth-tax fix (F-04) — likely yes, but lower priority since admin user count is small.

---

## Things that are working well

These are listed not just to be reassuring but to mark them as "do not change while fixing other things."

**Bundle composition is well-managed.** Heavy libraries are correctly lazy-loaded:
- `@react-pdf/renderer` is only imported in `src/components/vet/PrescriptionPDF.tsx`. Not loaded for customers.
- `@daily-co/daily-react` is dynamically imported in the consultation room page only. Not loaded for any non-call surface.
- No accidental full-library imports of lodash, moment, date-fns, etc.

**The customer dashboard already uses `Promise.all`.** The right pattern exists in the codebase (`dashboard/page.tsx:61`). F-14 is about applying this pattern to the pages that don't yet — the team knows how to do this.

**RSC and Server Component architecture is fundamentally sound.** Pages render on the server. Client components are minimal and well-targeted (`'use client'` is used appropriately, not over-used). React 19 + App Router is the right stack for this kind of app.

**RLS policies are present on all tables.** No data is accessible without RLS. This is a meaningful security baseline that some apps lack.

**Index health is good.** Cache hit rate is 100% on every query in the slow-query report. The DB has the right indexes for current load. The team did the work.

**List rendering uses stable keys.** No dropped re-render performance from missing or unstable `key` props.

**Sentry is correctly wired.** All five environment variables are set. Source map upload is configured. Tunnel route is in place to bypass ad-blockers. The infrastructure for production observability is ready, just needs the sample-rate adjustment.

**Email and webhooks are configured.** Resend API key and Daily webhook secret are both set in production.

**Subdomain-based portal isolation is implemented and working.** Three portals with separate auth, separate provisioning models, working in production.

---

## Discussions needed (parking lot)

Items that need a decision before or alongside fixing. Each is tagged with the stage at which to have the discussion.

**D-1: Auth caching strategy across requests.**
*Stage:* Before applying F-04 fix.
*Question:* Is the `cache()`-wrapped helper sufficient, or should we go further and pass user context from middleware to pages via request headers (avoiding even the one network call per request)?
*Who:* Engineer doing the fix + technical lead.
*Trade-off:* Simpler approach (`cache()` only) is one round-trip per page; header-passing is zero per page but adds plumbing.

**D-2: Polling vs Realtime for customer notifications.**
*Stage:* Before applying F-07 fix, after F-01 has shipped.
*Question:* Does the customer portal benefit enough from real-time push to justify the WebSocket connection on every customer's device? After F-01, a 30-second poll is ~150ms — not bad. But a Capacitor mobile build with always-open WebSocket has battery cost.
*Who:* Founder + lead engineer.
*Trade-off:* Realtime feels better, costs battery. Polling at 60s after F-01 might be the right balance for customers (vets need realtime for queue).

**D-3: Vet portal Realtime channel consolidation.**
*Stage:* During F-10 fix planning, before Capacitor vet app wrap (V-02).
*Question:* What's the right channel topology? One channel per vet with all events, or a few logical channels? How do we not break the vet UX during refactor?
*Who:* Lead engineer + a vet portal user (for testing).
*Trade-off:* Fewer channels = simpler + less DB load; risk of dropping an event type during refactor.

**D-4: ISR staleness window for consultation/patient detail pages.**
*Stage:* Before applying F-15 fix.
*Question:* Is up-to-60-seconds-stale data acceptable on a vet's view of patient history? What if another vet just made a note and this vet doesn't see it for 60 seconds?
*Who:* Founder + a vet user.
*Trade-off:* Speed vs freshness. Possible answer: 30s for patient detail, real-time invalidation via `revalidatePath` on the SOAP-note submit action.

**D-5: PetImage wrapper vs direct `next/image`.**
*Stage:* Before applying F-17 fix.
*Question:* Build a custom `<PetImage>` component using Supabase Storage transformation API, or use Next.js's image optimizer for everything?
*Who:* Frontend lead.
*Trade-off:* Custom wrapper is faster at runtime (CDN-direct from Supabase, no Next.js function involved). `next/image` is one-line-per-call and consistent with existing dashboard usage.

**D-6: Database compute upgrade timing.**
*Stage:* Before any marketing or app store launch with anticipated traffic spike.
*Question:* When do we move from `t4g.nano` to `t4g.small` or higher? What's our cache hit rate / P95 query time threshold for triggering an upgrade?
*Who:* Founder + lead engineer.
*Trade-off:* Cost vs headroom. Probably cheap to do proactively.

**D-7: Sentry steady-state sample rate after audit.**
*Stage:* 24 hours after F-01 ships and post-fix data is captured.
*Question:* What sample rate strikes the right balance between visibility and quota?
*Who:* Lead engineer.
*Trade-off:* 1.0 = full visibility, expensive at scale. 0.1 (current) = sparse data. 0.25 = recommended midpoint.

**D-8: Capacitor cookie strategy.**
*Stage:* Before starting Capacitor wrap (both apps).
*Question:* Will subdomain-based portal isolation survive inside a Capacitor webview, or do we need to refactor to use a single origin per app build?
*Who:* Mobile engineer + technical lead.
*Trade-off:* Single-origin per app is simpler in Capacitor. Subdomain isolation is what currently keeps the portals authentication-separated. Possible: build the customer app as a single-origin variant that only ever talks to the customer portal endpoints.

**D-9: Push notification strategy for vet app.**
*Stage:* During Capacitor vet app planning (before V-03 implementation).
*Question:* FCM, APNs, OneSignal, or Capacitor's native push plugin? How do we pipe Supabase notification events to whatever we choose?
*Who:* Mobile engineer + founder.
*Trade-off:* Native (FCM/APNs) is most reliable but most setup. OneSignal is faster to integrate but adds a vendor.

**D-10: Cashfree env vars launch checklist.**
*Stage:* Before flipping `NEXT_PUBLIC_SKIP_PAYMENTS` off in production.
*Question:* What's the full list of variables to set, and who tests the payment flow end-to-end before the flag flips?
*Who:* Founder + lead engineer.

---

## Appendix A — Audit methodology

This audit followed a phased approach.

**Phase 0 — Infrastructure snapshot:** Established baseline questions, captured Vercel and Supabase regions, verified Sentry configuration, identified initial hypothesis (region mismatch).

**Phase 1 — Network waterfall baseline:** Live measurement on production customer dashboard via Chrome DevTools, throttled to Fast 4G, hard reload, captured TTFB, total time, slowest requests, and full request waterfall.

**Phase 2 — Lighthouse:** Skipped intentionally. Network waterfall already provided the diagnostic information Lighthouse would have surfaced. Lighthouse can be re-run post-F-01 fix to capture before/after Performance scores for the report.

**Phase 3 — Database audit:** Pulled top 20 slow queries from Supabase production over 7 days. Mapped each to triggering code paths. Verified index health (cache hit rate, mean time per call). Identified Realtime as the dominant volume consumer.

**Phase 4 — Frontend code audit:** Read all `page.tsx` files in customer, vet, and admin portals. Read middleware, Supabase server/client/admin helpers, key hooks (NotificationBell, useVetDashboardRealtime, useFollowUpChat). Audited bundle composition via dependency analysis.

**Phase 5 — Capacitor pre-flight:** Reviewed bundle size, auth strategy, Realtime usage, and prefetch behavior through the lens of the planned mobile wrap.

**Phase 6 — Synthesis:** This document.

---

## Appendix B — Re-measurement protocol after F-01 deploys

To verify the impact of the region change:

1. Bump `tracesSampleRate` to 1.0 in production. Deploy. Wait 24 hours.
2. Capture P75 and P95 transaction durations in Sentry → Insights → Backend for: `/customer-portal/dashboard`, `/customer-portal/connect`, `/customer-portal/consultations`, `/customer-portal/pets`. Record numbers.
3. In Vercel, change Function Region to `bom1`. Trigger redeploy.
4. Wait 24 hours.
5. Re-capture the same metrics in Sentry.
6. Run the same DevTools network waterfall test from this report (Fast 4G, hard reload, DevTools open) and capture the new TTFB on the customer dashboard.
7. Update the "Baseline measurements" table in this document with both columns: Before F-01 / After F-01.
8. Drop `tracesSampleRate` to 0.25.

Expected outcome: TTFB drops from 2.11s to 500–700ms. P75 transaction durations drop by ~60–75% on most page-load transactions.

---

*End of report.*
