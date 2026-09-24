# Remediation backlog

Things discovered during a phase that belong to a later phase (operating
rule: "do not widen scope; log it here with a finding ID"). Each item names
the audit finding it relates to, the phase that should pick it up, and the
file:line where it was seen.

| ID | Related finding | Found in | Item | Where | Target phase |
|---|---|---|---|---|---|
| P0-1 | FE-5 | Phase 0 | `AuthForm.tsx` syncs the invite code from the URL/sessionStorage with `setState` inside a mount effect (`react-hooks/set-state-in-effect`). Suppressed with a scoped disable so CI could go green; the proper fix reads the URL on the server and passes it as a prop, and reads sessionStorage lazily on the client. | `src/components/customer/AuthForm.tsx:56` | 5 |
| P0-2 | BRK-6 | Phase 0 | No page in any portal lets a user set a new password after a recovery link. The vet welcome email says "change your password immediately" and the vet login form offers "forgot password", but both flows end at `/dashboard` signed in with the old password unchanged. Needs a `/settings/password` page (vet + admin) that calls `supabase.auth.updateUser({ password })`. | `src/components/vet/VetLoginForm.tsx:149`, `src/lib/email/templates.ts` (vetWelcomeEmail), `src/app/api/admin/password/route.ts` | 4 (route) + 5 (page) |
| P0-3 | SEC-6 | Phase 0 | The new "Vets can withdraw own pending flags" UPDATE policy limits the *state* a vet can write (`pending → withdrawn`) but not the *columns*; a vet could also change `details` on their own pending flag in the same statement. Column-level restriction needs the trigger pattern Phase 2 introduces for SEC-6. | `supabase/migrations/20260914100000_consultation_flags_vet_access.sql` | 2 |
| P0-4 | DB-4 | Phase 0 | `increment_prescribing_use_count` is not in `src/lib/database.types.ts` `Functions`, so the `.rpc()` call is untyped. Regenerating types from production (Phase 3) picks it up. | `src/app/api/analytics/capture-treatment/route.ts` | 3 |
| P0-5 | OBS-1 | Phase 0 | `withRoute()` reports handler-returned 5xx to Sentry as a message (no stack) because the 123 existing catch blocks still swallow the error object. Phase 4 replaces those blocks with `AppError` thrown through the wrapper. | `src/server/handler.ts` | 4 |
| P0-6 | SEC-9 | Phase 0 | `uploadthing@7.7.4` pins `effect@3.17.7` (GHSA-38f7-945m-qr2g, high, no fixed uploadthing release). An npm `overrides` entry forces `effect ^3.22.2`, within `@effect/platform`'s declared peer range. Re-check on every uploadthing release and drop the override when upstream moves. | `package.json` overrides | ongoing |
| P0-7 | ARC-6 | Phase 0 | Cron guard, Daily webhook and admin password reset all format their own log lines; the JSON logger with request id (Phase 4 `logger.ts`) should absorb them. | `src/lib/cron/auth.ts`, `src/app/api/daily/webhook/route.ts` | 4 |
| P0-8 | FE-1 | Phase 0 | `next build` warns that the `middleware` file convention is deprecated in favour of `proxy`. Expected; Phase 1 renames it. | `src/middleware.ts` | 1 |
| P0-9 | ARC-8 | Phase 0 | Docs in the mobile repo still describe deleted web routes: `furrie-mobile/docs/WEB_ARCH_DAILY.md` (token route) and `furrie-mobile/packages/api-client/src/categories/README.md` (create-room/token). Prose only; update when mobile resumes. | mobile repo | 8 |
| P0-10 | DB-1 | Phase 0 | The three Phase 0 migrations use CLI-style timestamp names (`20260914…`) while 000–021 use sequence numbers. Phase 3 archives 000–021 behind a production baseline; until then Gerard runs the three files by hand in the order listed in the phase report. | `supabase/migrations/` | 3 |
