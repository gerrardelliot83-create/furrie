# Security tests (S-1)

One file per rule set. Each file proves the **allowed** case and the **refused** case while acting as
real database roles (`anon`, `authenticated` with a user id, `service_role`), exactly as the Supabase
API would.

| File | Proves | Migration |
|---|---|---|
| `s1_01_anon.sql` | Signed-out callers are refused on every table in `public`, including tables created later; signed-in users and the server are unaffected (S-14) | `20260927100100_s1_anon_and_functions` |
| `s1_02_functions.sql` | Only the server can spend a credit (SEC-4) or validate an invite; trigger functions can't be called; `is_admin()`/`is_vet()` still answer correctly; sign-up still creates a profile (S-02, S-15) | `20260927100100_s1_anon_and_functions` |
| `s1_03_profiles.sql` | A user can edit name/phone/avatar/PIN/push token but not `role`, `is_active`, `email` (SEC-5, S-01) | `20260927100200_s1_profiles_role` |
| `s1_04_consultations.sql` | Customers can't insert consultations; the vet can complete/close/extend exactly as web and mobile do, nothing else (S-03, S-07) | `20260927100300_s1_write_rules` |
| `s1_05_vet_profiles.sql` | A vet can change availability/hours/specialisations/experience, not verification, ratings or VCI details (S-08) | `20260927100300_s1_write_rules` |
| `s1_06_care_plan_steps.sql` | The pet parent can only tick a step; the plan's vet and admins can edit (S-09) | `20260927100300_s1_write_rules` |
| `s1_07_follow_up_threads.sql` | Customers can't create or extend follow-up chats; both sides can still message (S-10) | `20260927100300_s1_write_rules` |
| `s1_08_credit_requests.sql` | No direct customer insert after file 6 (a plain pending one before it); the server can insert (S-11) | `…100300_s1_write_rules`, `…100500_s1_credit_requests_after_l1` |
| `s1_09_storage.sql` | `consultation-media` is private; nothing is listable signed out; own files only; admins see all (S-12, S-13) | `20260927100400_s1_storage` |

## How to run one (SQL Editor)

Supabase → project **furrie** → **SQL Editor** → **New query** → paste the whole file → **Run**.

- Everything happens inside **one** statement. The file creates four test accounts
  (`s1-test-…@example.invalid`), a pet and a consultation, runs every check as those accounts, and then
  **ends with an error on purpose**. The error undoes every change, test accounts included, so nothing is left
  behind and no transaction stays open on the pooled connection.
- Expected result: `ERROR: S1 TEST PASSED: <file> (N checks) …`
- A broken rule shows `ERROR: S1 TEST FAILED: <which check> (…)` and stops there.

This replaces a `BEGIN … ROLLBACK` script: same effect, but safe when the SQL Editor runs the file on a pooled
connection, and the result is always visible.

## Evidence already collected (2026-09-27)

Run in a local PGlite database (Postgres 18) built from production's structure as read through the read-only
connection on 2026-09-27: 32 tables, 27 functions, 18 triggers, 103 policies and every grant, no rows. The
harness lives in the S session's scratch folder, not in this repository.

1. **Control:** against today's production structure every file **fails** at its first check (the holes are real).
2. All six S-1 migrations applied twice (idempotent); every verification query in them matched.
3. All nine files **pass** (136 checks).
4. All six rollbacks applied twice: the catalogue returns exactly to production's.
5. Re-applied after rollback: identical to the first application; all nine files pass again.
6. Edge cases: with files 1–5 only, `s1_08` passes on its "pinned pending" branch; file 6 refuses to run where
   L1's SQL is absent.
