# V report: vets, reminders and the consultation (V-1)

**Agent V · 2026-09-27.** Plan: `furrie-launch/plans/V-plan.md`. Approval: `furrie-launch/approvals/V.md` (CTO, 27 Sep; Gerard confirmed "go" in the V session).

- **PR:** https://github.com/gerrardelliot83-create/furrie/pull/58 (`launch/v-vets` → `main`)
- **Branch base:** `origin/main@0564463` (L1 #53, L1.1 #54 and W-app #55 are included)
- **CI:** GitHub Actions on PR #58 (typecheck, lint, build, audit). Before push I ran the same four locally with the CI placeholders: typecheck 0 errors · lint 0 errors (12 warnings, all in files V didn't write, or pre-existing in them) · build OK · `npm audit --audit-level=high` 0 high (1 low, pre-existing).
- **Size:** 17 code commits + 2 report commits (3 of the code commits answer the CTO review). **No database changes.**

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
| 15 | `efa0d63` this report + `V-` backlog rows | — |
| 16 | late notes reach the pet parent | CTO review item 1 |
| 17 | record the real call length on Finish | CTO review item 2 |
| 18 | vet login explains `account_disabled` and `no_profile` | CTO review item 3 (from S's review) |
| 19 | this report update | — |

**CTO review of V-1 (`furrie-launch\approvals\V-review.md`), items 1–3, all fixed in this PR:**
1. **Late notes.** When the cron closes a consultation as success before the vet has written notes, the vet page now shows **"Send notes to the pet parent"**. That calls the same `/complete` route, which sends the follow-up chat, the follow-up email and the completion email once. The follow-up thread's existence is the "already sent" marker, so there is no DB change. Only the call that creates the thread sends emails. Racing calls keep the earliest thread and delete their own. Tested with a fake DB: 20 random interleavings each of three simultaneous presses, and of a press racing the finish side effects. The vet's normal Finish uses the same single step.
2. **Call length.** On Finish, the route records the length from Daily's meeting records for the room (summed, capped at 60). If Daily has none or doesn't answer within 5 s, it uses first join → now (capped at 60). With no join at all (a phone call finished from `scheduled`), the allotted 30 stays. `meeting.ended` still only updates active rows; I didn't let it rewrite a closed one, since Finish reads the same Daily records.
3. **Login errors.** `error=account_disabled` → "This account has been turned off. Contact support@furrie.in."; `error=no_profile` → "We couldn't find your account. Please sign in again."

Items 4–8 of the review (reminder vet re-send on retry, autosave re-arm, `revalidatePath` + disabled buttons before the start, the A-12 admin recovery design, the rate-limit backlog note) go to V-2.

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
| 16 | Late notes: book another test consultation; both join the call, then both leave **without** the vet pressing Finish or writing notes. Wait until ~100 min after the start (the stale-call cron closes it). | The consultation shows **Completed**. The customer gets an in-app "has ended… notes will appear here". **No** completion email yet. The vet gets "Please add your notes…". |
| 17 | The vet opens it, writes the chief complaint and a diagnosis, presses **Send notes to the pet parent** | "Notes sent to the pet parent". The customer gets **one** completion email + one follow-up email, and the follow-up chat opens. The button changes to "Consultation Completed". |
| 18 | Reload; if the button still showed, press it again (or call it from a second tab) | Nothing more is sent |
| 19 | Admin consultations page for a finished call | The duration is the call's real length (not always 30) |
| 20 | Deactivate a test **vet** account, then try to sign in at vet.furrie.in (after S-1 is live) | "This account has been turned off. Contact support@furrie.in." |

The no-show rules (missed/failed) are covered by tests, not by staging no-shows. The first real no-show produces an ops email.

---

## Deviations from the approved plan

1. **Base commit.** The approval said `603b4f1`. `main` moved to `e1cb38b` (L1.1 #54) before I started and to `0564463` (W-app #55) during the build, so I built on and rebased onto the latest `main`. The rebase was clean; no conflicts.
2. **Extra commit 6.** `createNotification` returns its error instead of throwing, so I wrapped the calls in the new side-effect and notice modules so a failed in-app notice reaches Sentry.
3. **New truthful "missed" email.** The crons no longer send `missedAppointmentEmail`: it said "no one joined the call" (not true when the vet was there) and "available 24/7" (W removed that line in #55). I added a V-block `customerMissedConsultationEmail` and an ops "action needed" email for `failed`.
4. **Completion duration.** Superseded by CTO review item 2 (commit 17): Finish now records Daily's measured length (the plan's original intent), with first join → now as the fallback.
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

---

# V-2 (2026-09-27)

- **PR:** https://github.com/gerrardelliot83-create/furrie/pull/60 (`launch/v-vets-2` → `main`)
- **Base:** `origin/main@59f7c49`, which includes V-1 (#58), W-A8 (#57) and S-1 (#56). I branched from `f91822a` and rebased onto S-1 without conflicts.
- **Scope:** the plan's items 13–15 (plan commits 15–22), plus items 4–7 of the CTO's V-1 review. Item 8 is logged in the backlog as row V-10. `src/app/admin-portal/(app)/consultations/**` is untouched (the CTO's A1).
- **Checks (local, CI placeholders):** typecheck 0 errors · lint 0 errors (12 existing warnings) · build OK · `npm audit --audit-level=high` 0 high · all V scratch tests pass (including new name and phone tests).
- **No database changes.**
- **Merge timing:** not between 15:00 and 16:30 IST on 27 Sep (a real consultation at 15:30). The CTO times the merge.

## In plain English

- Vet names no longer show as "Dr. Dr." anywhere: names are saved without "Dr.", and every screen and email adds it once.
- The vet's video room shows the pet parent's real name and concern, not placeholders. The customer's room no longer claims the vet "is waiting" before they join.
- The vet portal loads its notification bell once, which halves its background requests.
- Search on the vet's consultation list works.
- Phone numbers are accepted with or without +91 everywhere, and stored the same way.
- The admin portal has a Sign out button, and the page title matches the page.
- A vet approving or rejecting a vaccination record now actually saves it.
- "Total consultations" shows the real count.
- A retried reminder doesn't nag the vet twice.
- Autosave can't stall after a slow save.
- Pages refresh after a consultation closes, and Finish is greyed out until the start time.
- Changing an admin password needs the current password (8+ characters). A forgotten one is reset with a link, as before.

## Commits

| Commit | Closes |
|---|---|
| `a93900e` no more "Dr. Dr." | C-09 |
| `637c706` honest video-room text | C-12 room placeholders, B-05 / W's R6 ("is waiting for you") |
| `1a785b3` one notification bell on the vet portal | W-2 / B-08 (vet side) |
| `ec3a0f6` vet consultation search works | C-12 search |
| `9507bc2` one phone format for vets | C-12 phone clash |
| `9668ab8` admin portal sign-out and page title | C-10 (logout, title) |
| `1f1977b` vet vaccination approve/reject really save | A-10 (V half) |
| `9bb3d55` consultation totals are counted | item 15 (`consultation_count` never incremented) |
| `9857719` a retried reminder doesn't repeat the vet's notice | CTO review item 4 |
| `e4cb359` autosave re-arms after a slow save | CTO review item 5 |
| `a08ca67` refresh consultation pages on close; no Finish before the start | CTO review item 6 |
| `f802418` admin password change checks the current password | CTO review item 7 / A-12 |
| this report + backlog rows V-10, V-11 | review item 8 |

## Evidence and design notes

- **C-09.** The admin create/edit API and the vet's own profile update strip a leading "Dr." / "Dr" / "Doctor" (`app/api/vet/_lib/vetName.ts`; "Drishti" is kept; tested). Production has 1 vet whose stored name starts with "Dr" (read-only count). Gerard re-saving it once fixes every email and page, including other agents' pages that add "Dr.".
- **Room text.** The vet room reads `concern_text`, `symptom_categories` and the pet parent's `full_name` with the vet's own session (RLS: assigned consultations; S-1 kept vet reads). A line it can't fill is hidden.
- **Search.** `.or()` on an embedded table can't work in PostgREST. The new query sanitises the term (removes `,()*%\"'.:`), looks up matching pets and profiles (RLS limits these to the vet's patients), and filters by `pet_id` / `customer_id` / concern / number.
- **A-10.** One shared handler (`app/api/vet/_lib/vaccinationDecision.ts`) replaces the two near-identical routes. It uses the same request/response shapes, so the parked mobile vet app is unaffected.
- **Review 4.** The marker is the vet's in-app reminder of the same type for that consultation (`notifications.data @> {consultationId}`). The notice is written before the email. If the check itself fails, the reminder is sent (fail-open).
- **Review 5.** The autosave timer is armed only while no save is running (`hasUnsavedChanges && !isSaving`), so it re-arms as soon as a save ends.
- **Review 6.** `revalidatePath` is called for the vet and customer consultation, list and dashboard pages, from the `/complete` route (finish and late notes) and from both crons after a close. It is deliberately not called inside `after()`. Finish is disabled with "Finish from 4:00 pm" (India time) until a scheduled consultation's start, re-checked every 30 s.
- **A-12.**
  - The current password is checked with a throwaway Supabase client (`persistSession: false`), which signs its own extra session out again.
  - New passwords need at least 8 characters, and there are 5 attempts per 15 min per admin.
  - An admin's set-password link now lands on a new admin `/set-password` page, where the recovery session sets the password without the old one. Before, it landed on Settings, which only worked because the current password was ignored.
  - S-1's `safeNextPath()` keeps `/set-password` valid (it is in S's tests).

## Gerard's steps after V-2 is merged

1. **Fix the vet's name.** https://admin.furrie.in → **Vets** → the vet → **Edit** → change nothing (or remove the "Dr." yourself) → **Save**. The stored name loses its "Dr.".
2. **Smoke test (V-2):**

| # | Step | Expected |
|---|---|---|
| 21 | Vet dashboard; any email or page that names the vet | "Welcome back, Dr. <Name>"; "Dr." appears once everywhere |
| 22 | Customer joins the video room before the vet | "Dr. <Name> will join you in this video call" |
| 23 | Vet opens the room | Pet parent's real name and the real concern (or no line), not "General consultation" |
| 24 | Vet → Consultations → search a pet's name, the pet parent's name, and part of the concern | Matching consultations are listed; searching `a,b(` doesn't break the page |
| 25 | Vet → Profile → Edit → phone `+91 98765 43210` → Save; Admin → Vets → Edit the same vet → Save | Both save; the phone is shown as 10 digits |
| 26 | Admin portal on any page | Top bar shows the page's name; **Sign out** at the bottom of the sidebar signs out |
| 27 | Vet → Tasks → approve a pending vaccination record (if one exists) | "Approved"; after reload it shows Verified |
| 28 | Vet dashboard "Total Consultations"; Admin → Vets "Consultations" | The real number of completed consultations |
| 29 | Open a consultation scheduled for later today | Finish/Complete buttons are greyed out with "Finish from HH:MM" |
| 30 | Admin → Settings → change password with a wrong current password | "Your current password is not correct"; with the right one it changes |
| 31 | Admin → **Users** → an admin account (e.g. a second test admin) → **Reset Pwd**, then open the emailed link | The admin portal's **Set your password** page; saving works without the old password |

## Deviations from the plan

1. **Vaccination routes** share one handler module instead of being patched twice. Same shapes.
2. **The admin set-password page** reuses the vet `SetPasswordForm`. Its re-authentication message now covers both portals.
3. **Consultation totals** use a shared counting helper for the admin list, and the vet's own session count elsewhere. The `consultation_count` column is left as is (no DB change).
4. **Review item 4** uses the vet's existing in-app reminder as the "already sent" marker, rather than splitting the claim flags (no DB change).
5. **Review item 6's `revalidatePath`** runs in the handlers, not inside `runCompletionSideEffects`, because it runs inside `after()` for the route.

## Backlog additions (V-2)

- **V-10:** the new rate limits are per server instance (S-31).
- **V-11:** vet "Deactivate" should also ban the auth user (S-35 describes this for the admin users route). This one is V's file, for S-2.

## Test accounts or rows created (V-2)

None. There were no production writes. The only read-only query (vet names starting with "Dr") was run during V-1 planning.
