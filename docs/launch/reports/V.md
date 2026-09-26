# V report: vets, reminders and the consultation (V-1)

**Agent V · 2026-09-27.** Plan: `furrie-launch/plans/V-plan.md`. Approval: `furrie-launch/approvals/V.md` (CTO, 27 Sep; Gerard confirmed "go" in the V session).

- **PR:** https://github.com/gerrardelliot83-create/furrie/pull/58 (`launch/v-vets` → `main`)
- **Branch base:** `origin/main@0564463` (L1 #53, L1.1 #54 and W-app #55 are included)
- **CI:** GitHub Actions on PR #58 (typecheck, lint, build, audit). Before push I ran the same four locally with the CI placeholders: typecheck 0 errors · lint 0 errors (12 warnings, all in files V didn't write, or pre-existing in them) · build OK · `npm audit --audit-level=high` 0 high (1 low, pre-existing).
- **Size:** 14 commits (+1 for this report), 67 files, +3,328 / −1,291. **No database changes.**

---

## In plain English

- Vets no longer lose notes. Reopening a consultation shows the saved notes, and autosave only saves what the vet changed; it can never blank a field. Customers now see the vet's notes in their consultation panel too (the same bug hid them).
- "Finish consultation" is checked by the server. It can't happen before the appointment or twice, it needs notes first, and the follow-up chat, emails and invite reward each happen exactly once.
- Calls close correctly. Daily's "call ended" messages are now understood. One set of rules decides the outcome:
  - **success:** the vet finished it, or both people were in the call.
  - **missed:** the customer didn't come.
  - **failed:** the vet didn't come. Your ops inbox gets an email so you can make it right.
- Every time a person reads is India time. Reminders can't be sent twice, and they give the real join time. The 15-minute email's "Join" button, which opened a page that didn't exist, now works.
- On every vet page the vet gets a chime, a flashing tab and a browser notification when a booking arrives, when the customer enters the video room, and 5 minutes before each start.
- New vets get a "set your password" link instead of a password in the email. Vets can set or change their password. "Forgot password" and your "Send set-password link" button both work from any browser.
- The vet dashboard shows what's missing before customers can book. The admin Vets page shows each vet's hours and whether they are Available.

---

## Commits

| # | Commit | Closes |
|---|---|---|
| 1 | `4151d4c` India-time helpers | item 5 (base) |
| 2 | `39338b3` saved notes load on reopen; autosave can't blank them | C-01 (+ customer notes panel, approval required change 2) |
| 3 | `4d08eb7` finish a consultation on the server | C-02, seam 6 |
| 4 | `06d7c2e` Daily webhook reads Daily's documented payloads | P0R-1 |
| 5 | `29b4a7a` one rule set for missed / failed / success | A-07 |
| 6 | `92c6970` report failed in-app notices from completion and cron notices | hardening of 3 + 5 |
| 7 | `b823ee6` reminders claim first, speak India time, link to a real page | item 6 |
| 8 | `422e873` India time on every screen and document | item 5 (A-12, B-07, C-08, D-07), B-05 slot copy |
| 9 | `65c65d0` the vet hears bookings on every vet page | C-05 |
| 10 | `ebe8180` vets set their own password | C-04, SEC-10 (welcome email), P0-2 |
| 11 | `36ffc32` readiness checklist, IST labels, blocked save, admin view | C-06 |
| 12 | `dd313bb` deactivated vets are never offered or matched | C-03 (V half) |
| 13 | `52c556a` dashboard timeout shows retry, not a redirect loop | BRK-8 |
| 14 | `e1ec7e4` whole-slot, overlap-safe matcher; bounded slot range | D-06, A-11 |
| 15 | this report + `V-` backlog rows | — |

---

## Exit criteria and evidence

| Criterion | Status | Evidence |
|---|---|---|
| 1 Notes never lost | Done | Readers normalised at 5 sites + customer panel (`39338b3`). Prod: `soap_notes_consultation_id_key` is UNIQUE (read-only query). `soapDelta.ts` tests: a blank-opened form sends only the typed field; autosave holds back clears. |
| 2 Finishing on the server | Done | `app/api/vet/consultations/[id]/complete/route.ts`: role, assigned vet, status/start-time, notes, guarded update read back, `after()` side effects. No browser writes to `consultations`/`soap_notes`/`vet_profiles` remain in the vet portal (grep). |
| 3 Daily webhook | Done | Parser tested with Daily's three documented example bodies. A signed request through the real handler returned 200; a bad signature returned 401. Signature/replay code unchanged (diff). |
| 4 Cron rules | Done | `lib/scheduling/outcomes.ts`, every rule-table row tested. `mark-missed` touches only `scheduled`. Prod evidence of the old bug: the 26 Sep consultation was closed "success" 91 min after start, 1 min long, with no notes. |
| 5 India time | Done | 20+ sites (see commit 8). Helper tests at 00:10, 05:29 and 23:59 IST. Slot listing tested after midnight IST. |
| 6 Reminders | Done | Claim-before-send, release on total failure, 45–65 / 0–20 min windows (tests incl. 5-min tick coverage), "join from" text, working link (render test). Crons fail closed without `CRON_SECRET`; prod shows the secret works (15-min reminder sent 26 Sep). |
| 7 Vet hears bookings | Done | `components/layouts/VetLayout/VetAlerts.tsx`. The "customer is in the room" alert needs the webhook re-registered (Gerard's steps). |
| 8 Onboarding and passwords | Done | Token-hash link → `/auth/callback?…&next=/set-password` (no change to S's file). `/api/vet/password-link` sends only for vets, gives the same answer for every email, and is rate-limited per IP and per email. |
| 9 Readiness | Done | Checklist card; schedule save through the validated API, blocked while a day has errors; admin hours/availability column. |
| 10 Deactivated vets | Done | Both matcher and slot listing filter `is_active`. Fake-DB tests include a deactivated vet and a failed account check. |
| 11 BRK-8 | Done | A timeout or failed profile read renders the retry state; a redirect happens only for a loaded non-vet profile. |
| 12 Matcher | Done | Whole-slot and grid fit, overlap by duration, errors mean "no vet", 2 queries total. Fake-DB tests. `available-slots` clamped to now…now+8 days. |
| CI green | Pending GitHub run on #58 | Local four checks pass (above). |
| Click-through | After merge (production) | Previews 404 and have no vet/admin hosts (handoff 25 Sep). Smoke test below. |
| Report | This file | Copy in `furrie-launch\reports\V.md`. |

Approval confirmations:
- **Required change 1 (service-role writes):** complete route, completion side effects, `PATCH /api/vet/profile` (schedule, Available, name/phone), both crons and the webhook all write with `supabaseAdmin` after auth, role and ownership checks. SOAP autosave goes through S's `PATCH /api/consultations/[id]/soap-notes` (not edited).
- **Required change 4 (W's R6):**
  - "All our veterinarians are fully booked" is replaced in V-1 (commit 8: "No open times in the next 7 days…").
  - "is waiting for you" in the customer video room is V-2 commit 16.
  - The vet notification bell mounted twice (W's R3 / backlog W-2) is V-2 commit 17.
- **Required change 5:** the old 15-minute templates are kept, unused (backlog V-2).

---

## SQL files in run order

None.

---

## Gerard's steps (the CTO relays them)

**Before merge:** nothing for V.

**Right after V-1 is merged and deployed**, at a time with no consultation in progress:

1. **Get the Daily API key.** https://dashboard.daily.co → sign in → **Developers** → copy the **API key**. Don't paste it into any chat.
2. **Re-register the Daily webhook.** Start menu → *Windows PowerShell*. Type these three lines, pressing Enter after each:
   ```
   cd C:\Users\Aenesh\Desktop\furrie
   $env:DAILY_API_KEY = "PASTE-THE-KEY-HERE"
   npm run setup:daily-webhooks
   ```
   Near the end it prints **"HMAC Secret"** and a long value. Copy that value. It may say "Webhook is already active. No changes needed"; copy the value it prints anyway. Close PowerShell.
3. **Save it in Vercel as a Secret.** https://vercel.com → team *aeneshs-projects* → project **furrie** → **Settings** → **Environment Variables**. Find `DAILY_WEBHOOK_SECRET` → **⋯** → **Remove** (confirm). Then **Add New**:
   - Key: `DAILY_WEBHOOK_SECRET`
   - Value: the copied HMAC
   - Type: **Secret**
   - Environments: **Production** and **Preview**

   Click **Save**.
4. **Redeploy.** Project **furrie** → **Deployments** → the top *Production* deployment → **⋯** → **Redeploy** → confirm. Wait for *Ready*.
5. **Smoke test** (below). The vet's hours are Saturday/Sunday only, so run it on a weekend, or after the vet adds weekday hours.
6. **Confirm the webhook.** After the first real call: Vercel → project **furrie** → **Logs** → search `daily-webhook`. Look for `meeting.ended processed consultation=… recorded` with status **200**, and tell the CTO the time.

### Production smoke test (writes real rows; use the test customer's own credits)

| # | Step | Expected |
|---|---|---|
| 1 | Admin → Vets → **+ Create Vet** (test email). There is no password field. | "Vet account created … We've emailed them a link to set their password." The email says "Set your password" and contains **no password**. |
| 2 | Open that link on a phone (a different browser) | vet.furrie.in **Set your password**; save → dashboard |
| 3 | Vet dashboard | "Before customers can book you" shows the missing steps; times say IST |
| 4 | Schedule → make two blocks overlap | Error shown, **Save disabled**. Fix → Save. Turn on Available → the card disappears. Admin → Vets shows the hours and "Available". |
| 5 | Click **Turn on booking alerts** (allow). The customer books a slot ≥ 15 min ahead. | Within seconds on any vet page: chime, flashing tab title, browser notification, schedule refreshes |
| 6 | Wait for the 15-minute reminder | Email and in-app give the time in IST and "You can join from HH:MM". The email button opens the consultation page (not a 404). Only one of each. |
| 7 | At T−5; the customer joins | Vet alert "starts in 5 minutes"; then "Customer is in the video room" (needs steps 1–4 done) |
| 8 | Both in the call; the vet writes a note, **waits 40 s, reloads** | The note is still there |
| 9 | Clear the diagnosis, press **Complete Consultation** | Asked to add it; nothing closes |
| 10 | Fill it, Complete | Closed; button shows "Consultation Completed". The customer gets **one** completion email and the follow-up chat. **Finish Consultation** in a second tab says it was already completed. |
| 11 | Customer opens the consultation **from the Consultations list** | The panel shows the vet's notes (diagnosis, home care) |
| 12 | Vercel logs (step 6 above) | `meeting.ended … recorded`, 200 |
| 13 | Treatment-plan / prescription PDF | Today's IST date |
| 14 | Vet login → **Forgot your password?** (another browser) | "If this email belongs to a Furrie vet account…"; the email arrives and its link opens Set your password |
| 15 | Admin → Vets → **Deactivate** the test vet | Its hours vanish from the customer slot list; re-activate |

The no-show rules (missed/failed) are covered by tests, not by staging no-shows. The first real no-show produces an ops email.

---

## Deviations from the approved plan

1. **Base commit.** The approval said `603b4f1`. `main` moved to `e1cb38b` (L1.1 #54) before I started and to `0564463` (W-app #55) during the build, so I built on and rebased onto the latest `main`. The rebase was clean; no conflicts.
2. **Extra commit 6.** `createNotification` returns its error instead of throwing, so I wrapped the calls in the new side-effect and notice modules so a failed in-app notice reaches Sentry.
3. **New truthful "missed" email.** The crons no longer send `missedAppointmentEmail`: it said "no one joined the call" (not true when the vet was there) and "available 24/7" (W removed that line in #55). I added a V-block `customerMissedConsultationEmail` and an ops "action needed" email for `failed`.
4. **Completion duration.** The plan said "from Daily attendance". The route keeps the length `meeting.ended` recorded (if 1–60 min), else started→now capped at 60, which is the web's old rule. The stale-call cron uses Daily attendance.
5. **Admin dashboard "Today's consultations"** now counts today's appointments (India day, `scheduled_at`) instead of bookings created since UTC midnight.
6. **Readiness card** lists hours + Available only. "Turn on booking alerts" is a banner on every vet page instead of a checklist line, so it isn't shown twice.
7. **`PATCH /api/vet/profile`** also refuses deactivated accounts (small tightening; same response shape for the mobile app).
8. **New helper folders:** `app/api/vet/_lib/` (completion side effects, password link) and `app/api/cron/_lib/` (outcome notices), both inside V-owned paths. New pure modules: `lib/time/ist.ts`, `lib/scheduling/{outcomes,reminders,slotFit,summary}.ts`, `lib/daily/{rooms,webhookEvents}.ts`.

---

## Requests for other agents (unchanged from the plan unless noted)

- **S:**
  - `soap-notes/route.ts:71`: add the role check (A-03); V's SOAPForm now depends on this route.
  - `handleAuthCallback.ts:75-81`: keep `next=/set-password` valid. Signed-out requests must still reach `/api/vet/password-link` and `/auth/callback`.
  - After V-1 the web no longer writes `consultations`/`soap_notes`/`vet_profiles` from the browser, so their vet UPDATE policies can be tightened. The parked mobile vet app still closes consultations directly.
  - `roomNameForConsultation()` is exported from `lib/daily` for your room-name change.
- **L1:** automatic credit-back on `failed` (L1-7 / backlog V-1).
- **Customer portal (L5):** see backlog V-5 for admin pages outside V's files.

## Backlog additions

`V-1` … `V-9` in `docs/audits/backlog.md`: credit-back on failed; unused templates and routes (D6); `vet_joined_at`; dead `postgres_changes`; IST on non-V admin pages; expiring recording links; unique follow-up thread; BRK-10 index; web push.

## Test accounts or rows created

None. No production writes were made. Read-only `SELECT`s (counts and structure only) were run through `supabase-furrie-readonly` after the identity check.
